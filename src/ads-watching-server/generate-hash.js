const bcrypt = require("bcrypt");

const password = "Rizwan1122";

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
