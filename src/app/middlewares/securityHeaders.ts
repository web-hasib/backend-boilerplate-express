import helmet from "helmet";

export default helmet({
  contentSecurityPolicy: false, // Pure REST API serving JSON — CSP not needed
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin asset loading (e.g. S3 images)
});

