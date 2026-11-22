import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import searchController from '../controllers/search.controller';

const router = Router();

router.get('/', isAuthenticated, searchController.search);

export default router;
