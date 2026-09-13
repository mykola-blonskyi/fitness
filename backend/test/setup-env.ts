// AppModule builds its MinIO client in a constructor, so the module graph
// cannot compile without these. Dummy values: the e2e spec only hits the
// @Public() `/` route and never reaches storage.
process.env.MINIO_ENDPOINT ??= 'localhost';
process.env.MINIO_ACCESS_KEY ??= 'e2e';
process.env.MINIO_SECRET_KEY ??= 'e2e';
