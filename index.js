const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.i7ulodc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoryCollection = client.db('jewelryResale').collection('categories');
        const productCollection = client.db('jewelryResale').collection('products');
        const bookingCollection = client.db('jewelryResale').collection('bookings');
        const paymentsCollection = client.db('jewelryResale').collection('payments');
        const recommendCollection = client.db('jewelryResale').collection('recommendation');
        const usersCollection = client.db('jewelryResale').collection('users');

        app.get('/categories', async (req, res) => {
            const query = {}
            const cursor = categoryCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        });

        // api query for specific category
        app.get('/categories/:name', async (req, res) => {
            const category_name = req.params.name;
            const query = { category_name: category_name };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });

        // api for take booking
        app.post('/bookings', async (req, res) => {
            const book = req.body;
            const result = await bookingCollection.insertOne(book);
            res.send(result);
        })

        // read specific user's bookings data
        app.get('/bookings', async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = bookingCollection.find(query);
            const booked = await cursor.toArray();
            res.send(booked);
        })

        // read specific seller's adding products
        app.get('/products', async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })

        // category based api
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        // stripe payment api
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // this api is for payment info save
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // extra section api
        app.get('/recommendation', async (req, res) => {
            const query = {}
            const cursor = recommendCollection.find(query);
            const recommend = await cursor.toArray();
            res.send(recommend);
        })

        // add a new product api
        app.post('/categories', async (req, res) => {
            const category = req.body;
            const result = await productCollection.insertOne(category);
            res.send(result);
        })

        // save user api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // api query for specific user to find out seller/buyer/admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.account_type === 'Admin' });
        })
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.account_type === 'Seller' });
        })
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.account_type === 'Buyer' });
        })

        // product delete
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        
        // app.get('/book', async (req, res) => {
        //     const query = { paid:true}
        //     const cursor = bookingCollection.find(query);
        //     const products = await cursor.toArray();
        //     res.send(products);
        // })
    }
    finally {

    }
}
run().catch(err => console.log(err));

app.get('/', async (req, res) => {
    res.send('jewelry-resale');
})

app.listen(port, () => console.log(`resale server is running on ${port}`));