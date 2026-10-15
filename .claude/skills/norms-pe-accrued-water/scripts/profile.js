// Accrual profile picked by env UTIL (water | electric), default water. Account guids come from ids.json.
const P = require("./profiles.json")[process.env.UTIL || "water"];
if (!P) throw new Error("unknown UTIL " + process.env.UTIL);
module.exports = P;
