import app from './app';
import 'dotenv/config';

const port = Number(process.env.PORT || 4002);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});



