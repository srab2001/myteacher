import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(Number(env.PORT), () => {
  console.log(`🚀 API server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});
