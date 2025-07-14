const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const gardenRoutes = require('./routes/gardens');
app.use('/api/gardens', gardenRoutes);

const plantRoutes = require('./routes/plants');
app.use('/api/gardens/:gardenId/plants', plantRoutes);

const advisoryRoutes = require('./routes/advisory');
app.use('/api', advisoryRoutes);




app.get('/', (req, res) => {
  res.send('🌱 Plant Potter backend is running!');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
