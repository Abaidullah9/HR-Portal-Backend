import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import userModel from '../models/user.model';
import roleModel from '../models/role.model';
import { CreateUserDTO } from '../utils/dtos/user.dto';
import { MESSAGES } from '../utils/helper/constants/messages';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../utils/helper/helper.functions';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';
import { tenantFilter, tenantFields } from '../utils/context';
import { frontendUrl, sendMail } from '../utils/mailer';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const inviteExpiryDays = () => Number(process.env.INVITE_EXPIRY_DAYS || 7);

export interface InviteInput {
  name: string;
  email: string;
  roleId?: string;
  roleName?: string;
}

/**
 * Creates a login that cannot be used until the person accepts the invite and
 * chooses their own password. There is no shared or generated password to leak,
 * and no employee record is created here — linking the person to an Employee is
 * the caller's job (add employee, hire, bulk import).
 */
export const inviteUser = async (input: InviteInput, organizationId?: string) => {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!name || !email) throw new AppError('A name and email are required', StatusCode.BAD_REQUEST);

  const existing = await userModel.findOne({ email });
  if (existing) throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, StatusCode.CONFLICT);

  const role = input.roleId
    ? await roleModel.findById(input.roleId)
    : await roleModel.findOne({ roleName: input.roleName ?? 'Employee' });
  if (!role) throw new AppError('That role does not exist', StatusCode.BAD_REQUEST);
  if (role.roleName.toLowerCase() === 'admin' && !input.roleId) {
    throw new AppError('Administrator invites must choose the role explicitly', StatusCode.BAD_REQUEST);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

  const user = await userModel.create({
    ...tenantFields(),
    ...(organizationId ? { organizationId } : {}),
    name,
    email,
    password,
    roleId: role._id,
    isActive: true,
    inviteToken: hashToken(token),
    inviteTokenExpires: new Date(Date.now() + inviteExpiryDays() * 24 * 60 * 60 * 1000),
  });

  const inviteLink = `${frontendUrl()}/accept-invite?token=${token}`;
  const delivery = await sendMail({
    to: email,
    subject: 'You have been invited to the HR portal',
    text: `Hello ${name},\n\nSet your password to activate your account:\n${inviteLink}\n\nThe link expires in ${inviteExpiryDays()} days.`,
  });

  return {
    user,
    inviteLink,
    delivered: delivery.delivered,
    ...(process.env.NODE_ENV !== 'production' ? { token } : {}),
  };
};

const registerUser = async (userData: CreateUserDTO & { inviteToken?: string }) => {
  if (!userData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  // Open self-registration used to create logins with no employee record — an
  // account that could sign in but had no leave, payroll or profile. Accounts
  // are now created by invitation, so signup must present the invite token.
  if (!userData.inviteToken) {
    throw new AppError(
      'Accounts are created by invitation. Ask HR for an invite link.',
      StatusCode.FORBIDDEN,
    );
  }

  const user = await acceptInvite(userData.inviteToken, userData.password);
  const token = generateToken(user._id.toString(), user.tokenVersion ?? 0);
  return { user, token };
};

const loginUser = async (email: string, password: string) => {
  if (!email || !password) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const user = await userModel.findOne({ email }).select('+password');
  if (!user) throw new AppError(MESSAGES.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError(MESSAGES.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);

  if (!user.isActive) throw new AppError(MESSAGES.ACCOUNT_DEACTIVATED, StatusCode.FORBIDDEN);
  if (user.inviteToken && !user.password) {
    throw new AppError('This account has not been activated yet. Use the invite link in your email.', StatusCode.FORBIDDEN);
  }

  user.lastLogin = new Date();
  await user.save();

  const user_obj = user.toObject();
  const { password: _, ...userData } = user_obj;
  const token = generateToken(user._id.toString(), user.tokenVersion ?? 0);

  return { user: userData, token };
};

/** Consumes an invite: sets the password and clears the token in one write. */
export const acceptInvite = async (token: string, password: string) => {
  if (!token || !password) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (password.length < 8) {
    throw new AppError('Choose a password of at least 8 characters', StatusCode.BAD_REQUEST);
  }

  const user = await userModel
    .findOne({ inviteToken: hashToken(token), inviteTokenExpires: { $gt: new Date() } })
    .select('+inviteToken +inviteTokenExpires');
  if (!user) throw new AppError('This invite link is invalid or has expired', StatusCode.BAD_REQUEST);

  await userModel.updateOne(
    { _id: user._id },
    {
      $set: { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date() },
      $inc: { tokenVersion: 1 },
      $unset: { inviteToken: 1, inviteTokenExpires: 1 },
    },
  );

  const activated = await userModel.findById(user._id);
  if (!activated) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  const plain = activated.toObject();
  const { password: _password, ...safe } = plain;
  return safe;
};

const clearResetToken = { $unset: { resetToken: 1, resetTokenExpires: 1 } };

/**
 * Issues a one-time reset token. The response never reveals whether the email
 * exists. Delivery goes through the mailer; outside production the raw token is
 * also returned so the flow can be tested without a provider.
 */
const forgotPassword = async (email: string) => {
  if (!email) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const user = await userModel.findOne({ email });
  if (!user) return { delivered: true };

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = hashToken(token);
  user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const link = `${frontendUrl()}/reset-password?token=${token}`;
  const delivery = await sendMail({
    to: email,
    subject: 'Reset your HR portal password',
    text: `Use this link within 30 minutes to choose a new password:\n${link}`,
  });

  const result: { delivered: boolean; token?: string } = { delivered: delivery.delivered };
  if (process.env.NODE_ENV !== 'production') result.token = token;
  return result;
};

const resetPassword = async (token: string, password: string) => {
  if (!token || !password) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (password.length < 8) throw new AppError('Choose a password of at least 8 characters', StatusCode.BAD_REQUEST);

  const user = await userModel
    .findOne({ resetToken: hashToken(token), resetTokenExpires: { $gt: new Date() } })
    .select('+resetToken +resetTokenExpires');
  if (!user) {
    throw new AppError('This reset link is invalid or has expired', StatusCode.BAD_REQUEST);
  }

  await userModel.updateOne(
    { _id: user._id },
    {
      $set: {
        password: await bcrypt.hash(password, 10),
        passwordChangedAt: new Date(),
      },
      // Any session opened before the reset was issued must not survive it.
      $inc: { tokenVersion: 1 },
      ...clearResetToken,
    },
  );
};

/** Signed-in password change. Verifies the current password before replacing it. */
const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  if (!currentPassword || !newPassword) {
    throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  }
  if (newPassword.length < 8) {
    throw new AppError('Choose a password of at least 8 characters', StatusCode.BAD_REQUEST);
  }

  const user = await userModel.findById(userId).select('+password');
  if (!user) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) throw new AppError('Your current password is not correct', StatusCode.BAD_REQUEST);
  if (currentPassword === newPassword) {
    throw new AppError('Choose a password you have not used before', StatusCode.BAD_REQUEST);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  return { changedAt: user.passwordChangedAt };
};

const getAllUser = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const filter = tenantFilter();
  const allUsers = await userModel
    .find(filter)
    .select('-password -inviteToken -resetToken')
    .populate('roleId', 'roleName')
    .skip(skip)
    .limit(limit);
  const total = await userModel.countDocuments(filter);
  if (!allUsers) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);
  return paginatedResult(allUsers, total, page, limit);
};

const getUserById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  // The signed-in user needs the concrete action names, not just the role label:
  // the client gates its UI on them so a renamed or custom role still works.
  const userById = await userModel.findById(_id).select('-password').populate({
    path: 'roleId',
    select: 'roleName actions',
    populate: { path: 'actions', select: 'actionName' },
  });
  if (!userById) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);
  return userById;
};

const updateUser = async (_id: string, updateData: Partial<CreateUserDTO>) => {
  if (!_id || !updateData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  if (updateData.email) {
    const existingUser = await userModel.findOne({ email: updateData.email });
    if (existingUser && existingUser._id.toString() !== _id) {
      throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, StatusCode.CONFLICT);
    }
  }
  // An administrative password change is still a password change: it has to
  // invalidate whatever session the account was using before it.
  const update = updateData.password
    ? {
        $set: {
          ...updateData,
          password: await bcrypt.hash(updateData.password, 10),
          passwordChangedAt: new Date(),
        },
        $inc: { tokenVersion: 1 },
      }
    : updateData;

  const updatedUser = await userModel
    .findByIdAndUpdate(_id, update, { returnDocument: 'after' })
    .select('-password')
    .populate('roleId', 'roleName');
  if (!updatedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedUser;
};

const deleteUser = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return userModel.findByIdAndDelete(_id).select('-password');
};

const updateUserStatus = async (_id: string, isActive: boolean) => {
  if (!_id || isActive === undefined) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  // Deactivating already stops every request at the isActive check; bumping the
  // generation also kills the token itself, so reactivating the account does not
  // revive old cookies.
  const updatedUser = await userModel
    .findByIdAndUpdate(
      _id,
      { $set: { isActive }, ...(isActive ? {} : { $inc: { tokenVersion: 1 } }) },
      { returnDocument: 'after' },
    )
    .select('-password')
    .populate('roleId', 'roleName');
  if (!updatedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedUser;
};

const updateUserRole = async (_id: string, roleId: string) => {
  if (!_id || !roleId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedUser = await userModel
    .findByIdAndUpdate(_id, { roleId }, { returnDocument: 'after' })
    .select('-password')
    .populate('roleId', 'roleName');
  if (!updatedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedUser;
};

export default {
  registerUser,
  inviteUser,
  acceptInvite,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword,
  getAllUser,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole,
};
