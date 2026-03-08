```javascript
const express = require('express');
const accountController = require('../controllers/account.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const accountValidation = require('../validators/account.validator');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(accountValidation.createAccount), accountController.createAccount)
  .get(auth(), accountController.getUserAccounts);

router
  .route('/:accountId')
  .get(auth(), accountController.getAccountDetails)
  .patch(auth(), validate(accountValidation.updateAccount), accountController.updateAccount)
  .delete(auth(), accountController.deleteAccount);

router.post('/:accountId/deposit', auth(), validate(accountValidation.depositWithdraw), accountController.depositToAccount);
router.post('/:accountId/withdraw', auth(), validate(accountValidation.depositWithdraw), accountController.withdrawFromAccount);

module.exports = router;
```