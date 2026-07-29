@echo off
title Node.js TypeScript Boilerplate Creator

echo ============================================
echo Creating Backend Boilerplate...
echo ============================================

:: Initialize npm
call npm init -y

:: Install dependencies
call npm install express mongoose dotenv

:: Install dev dependencies
call npm install -D typescript ts-node nodemon @types/node @types/express

:: Create folders
mkdir src
mkdir src\config
mkdir src\controllers
mkdir src\middleware
mkdir src\models
mkdir src\routes
mkdir src\services
mkdir src\utils

:: Create tsconfig.json
(
echo {
echo   "compilerOptions": {
echo     "rootDir": "./src",
echo     "outDir": "./dist",
echo     "module": "NodeNext",
echo     "moduleResolution": "NodeNext",
echo     "target": "ESNext",
echo     "lib": ["ESNext"],
echo     "types": ["node"],
echo     "sourceMap": true,
echo     "declaration": true,
echo     "declarationMap": true,
echo     "strict": true,
echo     "noUncheckedIndexedAccess": true,
echo     "exactOptionalPropertyTypes": true,
echo     "verbatimModuleSyntax": false,
echo     "isolatedModules": true,
echo     "noUncheckedSideEffectImports": true,
echo     "moduleDetection": "force",
echo     "esModuleInterop": true,
echo     "forceConsistentCasingInFileNames": true,
echo     "skipLibCheck": true
echo   },
echo   "include": ["src"]
echo }
) > tsconfig.json

:: Create nodemon.json
(
echo {
echo   "watch": ["src"],
echo   "ext": "ts",
echo   "exec": "ts-node src/server.ts"
echo }
) > nodemon.json

:: Create .gitignore
(
echo node_modules
echo dist
echo .env
) > .gitignore

:: Create .env
(
echo PORT=5000
echo MONGO_URI=mongodb://127.0.0.1:27017/mydatabase
) > .env

:: Create db.ts
(
echo import mongoose from "mongoose";
echo.
echo const connectDB = async ^(^): Promise^<void^> =^> {
echo     try {
echo         await mongoose.connect(process.env.MONGO_URI!);
echo         console.log("MongoDB Connected");
echo     } catch ^(error^) {
echo         console.error^(error^);
echo         process.exit^(1^);
echo     }
echo };
echo.
echo export default connectDB;
) > src\config\db.ts

:: Create app.ts
(
echo import express from "express";
echo import routes from "./routes";
echo.
echo const app = express^(^);
echo.
echo app.use^(express.json^(^)^);
echo.
echo app.use^("/api", routes^);
echo.
echo export default app;
) > src\app.ts

:: Create server.ts
(
echo import dotenv from "dotenv";
echo dotenv.config^(^);
echo.
echo import app from "./app";
echo import connectDB from "./config/db";
echo.
echo const PORT = process.env.PORT ^|^| 5000;
echo.
echo const startServer = async ^(^) =^> {
echo     await connectDB^(^);
echo.
echo     app.listen^(PORT, ^(^)^ =^> {
echo         console.log^(`Server running on http://localhost:${PORT}`^);
echo     }^);
echo };
echo.
echo startServer^(^);
) > src\server.ts

:: Create routes
(
echo import { Router } from "express";
echo.
echo const router = Router^(^);
echo.
echo router.get^("/", ^(req, res^) =^> {
echo     res.json^({
echo         success: true,
echo         message: "API Working"
echo     }^);
echo }^);
echo.
echo export default router;
) > src\routes\index.ts

:: Update package.json scripts
powershell -Command ^
"$pkg = Get-Content package.json | ConvertFrom-Json; ^
$pkg.scripts = @{dev='nodemon';build='tsc';start='node dist/server.js'}; ^
$pkg | ConvertTo-Json -Depth 10 | Set-Content package.json"

echo.
echo ============================================
echo Boilerplate Created Successfully!
echo.
echo Run:
echo.
echo     npm run dev
echo.
echo ============================================

pause