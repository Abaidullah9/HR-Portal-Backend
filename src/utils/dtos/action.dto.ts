export interface CreateActionDTO {
  actionName: string;
  actionDescription: string;
  module: string;
}

export interface UpdateActionDTO {
  actionName?: string;
  actionDescription?: string;
  module?: string;
}
