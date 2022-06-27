declare global {
    namespace NodeJS {
      interface ProcessEnv {
        APP_PORT: string;
        APP_URL: string;

        MONGODB_URI: string;

        JWT_SECRET: string;

        MAIL_USER: string;
        MAIL_PASS: string;

        STRIPE_PUBLIC: string;
        STRIPE_SECRET: string;

        STRIPE_WEBHOOK: string

      }
    }
  }
  
  // If this file has no import/export statements (i.e. is a script)
  // convert it into a module by adding an empty export statement.
  export {}