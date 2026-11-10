// bcrypt is a native module that takes ~0.3 s to load. Load it on the first
// login / password change instead of at every server start.
let bcrypt = null;
const lib = () => bcrypt || (bcrypt = require('bcrypt'));

module.exports = {
  hash: (plain, rounds) => lib().hash(plain, rounds),
  compare: (plain, hashed) => lib().compare(plain, hashed),
};
