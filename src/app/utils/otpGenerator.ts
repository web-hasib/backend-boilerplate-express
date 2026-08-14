import { randomInt } from "crypto";

// crypto.randomInt uses the OS CSPRNG — generates 4-digit OTP (1000 - 9999)
const generateOTP = (): string => randomInt(1000, 10000).toString();

export default generateOTP;
