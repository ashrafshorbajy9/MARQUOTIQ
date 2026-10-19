import { hashPassword } from "../lib/auth.js";

let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.trimEnd();
if (!password) {
  console.error("Pass the password through standard input; do not include it in shell history.");
  process.exit(1);
}
console.log(hashPassword(password));
