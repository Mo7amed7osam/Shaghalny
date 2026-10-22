const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI (or MONGODB_URI) is not set');
        }
        // MONGO_DB_NAME selects the database without editing the credential-bearing URI.
        const dbName = (process.env.MONGO_DB_NAME || '').trim();
        if (dbName && !/^[A-Za-z0-9_-]{1,63}$/.test(dbName)) {
            throw new Error('MONGO_DB_NAME contains unsupported characters.');
        }
        const conn = await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);
        const demoDatabase = /^Shaghalny-Demo-\d{8}$/.test(conn.connection.name);
        if ((process.env.DEMO_MODE === 'true') !== demoDatabase) {
            throw new Error('DEMO_MODE and the separately named Shaghalny-Demo-YYYYMMDD database must match.');
        }
        console.log(`MongoDB Connected: ${conn.connection.name}`);
    } catch (error) {
        const message = error && error.message ? error.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
