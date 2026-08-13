import { randomInt } from "crypto";

// crypto.randomInt uses the OS CSPRNG — required for security-sensitive values
const generateOTP = (): string => randomInt(100000, 1000000).toString();

export default generateOTP;
