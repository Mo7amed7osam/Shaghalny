const { body, validationResult } = require('express-validator');

// Validator for user registration
const registerValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['Student', 'Client']).withMessage('Invalid role'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Validator for job posting
const jobValidator = [
  body('title').notEmpty().withMessage('Job title is required'),
  body('description').notEmpty().withMessage('Job description is required'),
  body('requiredSkills').isArray().withMessage('Required skills must be an array'),
];

// Function to validate request data
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateRegistration = [...registerValidator, validate];
const validateLogin = [...loginValidator, validate];

module.exports = {
  registerValidator,
  loginValidator,
  jobValidator,
  validate,
  validateRegistration,
  validateLogin,
};
