```javascript
const httpStatus = require('http-status-codes');
const accountService = require('../services/account.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

const createAccount = catchAsync(async (req, res) => {
  const accountData = { ...req.body, userId: req.user.id };
  const account = await accountService.createAccount(accountData);
  res.status(httpStatus.CREATED).send(account);
});

const getUserAccounts = catchAsync(async (req, res) => {
  const accounts = await accountService.getAccountsByUserId(req.user.id);
  res.send(accounts);
});

const getAccountDetails = catchAsync(async (req, res) => {
  const account = await accountService.getAccountById(req.params.accountId);
  if (!account || account.userId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found or access denied');
  }
  res.send(account);
});

const updateAccount = catchAsync(async (req, res) => {
  const account = await accountService.updateAccount(req.params.accountId, req.user.id, req.body);
  res.send(account);
});

const deleteAccount = catchAsync(async (req, res) => {
  await accountService.deleteAccount(req.params.accountId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const depositToAccount = catchAsync(async (req, res) => {
  const { amount } = req.body;
  const account = await accountService.depositToAccount(req.params.accountId, req.user.id, amount);
  res.send(account);
});

const withdrawFromAccount = catchAsync(async (req, res) => {
  const { amount } = req.body;
  const account = await accountService.withdrawFromAccount(req.params.accountId, req.user.id, amount);
  res.send(account);
});

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountDetails,
  updateAccount,
  deleteAccount,
  depositToAccount,
  withdrawFromAccount,
};
```