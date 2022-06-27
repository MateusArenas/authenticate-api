import app from './app';

app.server.listen(process.env.APP_PORT as string, () => {
    console.log(`${process.env.APP_URL as string}:${process.env.APP_PORT as string}`);
})
