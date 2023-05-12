/* eslint-disable @typescript-eslint/no-var-requires */
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

// This file is entered from userRoutes.cjs and will
// call a specific function

const httpStatus = {
	ok: 200,
	created: 201,
	bad: 400,
	unauthorized: 401,
	notFound: 404,
};

// !----------------------------------------------------------------------- //

// Generate JWT
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// !----------------------------------------------------------------------- //

// @description   Get users list
// @route         GET /api/users
// @access        Private
const getUsers = asyncHandler(async (req, res) => {
	const users = await User.find();

	let usersArray = [];

	users.forEach((user) => {
		usersArray.push({
			name: `${user.fName} ${user.lName}`,
			email: `${user.email}`,
		});
	});

	res.status(httpStatus.ok).json(usersArray);
});

// !----------------------------------------------------------------------- //

// @description   Get user data
// @route         GET /api/users/me
// @access        Private
const getMe = asyncHandler(async (req, res) => {
	const { _id, fName, email } = await User.findById(req.user.id);

	res.status(200).json({ id: _id, email, message: `Logged in as ${fName}` });
});

// !----------------------------------------------------------------------- //

// @description   Register new user
// @route         POST /api/users/register
// @access        Public
const registerUser = asyncHandler(async (req, res, next) => {
	const { fName, lName, email, password } = req.body;

	// Check if user exists
	const userExists = await User.findOne({ email: email });

	if (userExists) {
		res.status(httpStatus.bad);
		const error = new Error('Employee ID already exists, please login');
		next(error);
	}

	// Hash password
	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);

	// Create user
	await User.create(
		{
			fName: _.capitalize(fName),
			lName: _.capitalize(lName),
			email: _.toLower(email),
			password: hashedPassword,
		},
		(err, newUser) => {
			if (err) {
				res.status(422);
				const error = new Error('Invalid data. User not registered.');
				console.log(err);
				next(error);
			} else {
				res.status(httpStatus.ok).json({
					_id: newUser.id,
					name: `${newUser.fName} ${newUser.lName}`,
					email: newUser.email,
					token: generateToken(newUser._id),
				});
			}
		}
	);
});

// !----------------------------------------------------------------------- //

// @description   Authenticate user
// @route         POST /api/users/login
// @access        Public
const loginUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	// Check for user email
	const user = await User.findOne({ email });

	if (user && (await bcrypt.compare(password, user.password))) {
		res.json({
			_id: user.id,
			name: `${user.fName} ${user.lName}`,
			email: user.email,
			token: generateToken(user._id),
		});
	} else {
		res.status(httpStatus.bad);
		throw new Error('Invalid login credentials. User not logged in');
	}
});

// !----------------------------------------------------------------------- //

// @description   Update user
// @route         PUT /api/users/:id
// @access        Private
const updateUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.params.id);

	if (!user) {
		res.status(httpStatus.bad);
		throw new Error('User not found');
	}

	const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
	});

	res.status(httpStatus.ok).json(updatedUser);
});

// !----------------------------------------------------------------------- //

// @description   Delete user
// @route         DELETE /api/users/:id
// @access        Private
const deleteUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.params.id);

	if (!user) {
		res.status(httpStatus.bad);
		throw new Error('User not found');
	}

	await User.deleteOne({ _id: user.id });

	res.status(httpStatus.ok).json({ Message: `Deleted ${user.id}` });
});

// !----------------------------------------------------------------------- //

// Exporting functions out of file //
module.exports = {
	getUsers,
	getMe,
	registerUser,
	loginUser,
	updateUser,
	deleteUser,
};
