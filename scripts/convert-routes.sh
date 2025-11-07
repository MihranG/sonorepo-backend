#!/bin/bash

# Script to batch convert CommonJS routes to ES Modules

for file in routes/*.ts; do
  # Replace require statements with imports
  sed -i '' "s/const express = require('express');/import express, { Request, Response, Router } from 'express';/g" "$file"
  sed -i '' "s/const router = express.Router();/const router: Router = express.Router();/g" "$file"
  sed -i '' "s/const pool = require('..\/config\/database');/import pool from '..\/config\/database';/g" "$file"
  sed -i '' "s/const prisma = require('..\/config\/prisma');/import prisma from '..\/config\/prisma';/g" "$file"
  
  # Replace module.exports with export default
  sed -i '' "s/module.exports = router;/export default router;/g" "$file"
  
  echo "Converted $file"
done

echo "✅ All routes converted to TypeScript modules!"
