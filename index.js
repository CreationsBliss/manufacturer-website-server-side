const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ynxrlo3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access ' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}


async function run() {

  try {
    await client.connect();
    const toolCollection = client.db('screw_driver').collection('tools');

    const reviewCollection = client.db('screw_driver').collection('reviews');

    const orderCollection = client.db('screw_driver').collection('orders');
    const paymentCollection = client.db('screw_driver').collection('payments');
    const userCollection = client.db('screw_driver').collection('users');
    const addProductCollection = client.db('screw_driver').collection('addProduct');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'Forbidden' });
      }
    }

    app.get('/tool', async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });


    app.get('/review', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });


    app.post('/review', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });






    // app.get('/user/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: ObjectId(id) };
    //   const result = await userCollection.findOne(query);
    //   res.send(result);
    // })







    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });


    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin })
    });


    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ result, token });
    });


    app.get('/tool/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
    });



    app.get('/order', verifyJWT, async (req, res) => {
      const customer = req.query.userEmail;
      const decodedEmail = req.decoded.email;
      if (customer === decodedEmail) {
        const query = { userEmail: customer };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      }
      else {
        return res.status(403).send({ message: 'Forbidden access' });
      }
    });


    app.get('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });



    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      return res.send({ success: true, result });
    });


    app.patch('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      // console.log(payment.payment.transactionId);
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.payment.transactionId,
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);

    });


    app.get('/tools', verifyJWT, verifyAdmin, async (req, res) => {
      const tools = await toolCollection.find().toArray();
      res.send(tools);
    });

    app.post('/tool', verifyJWT, verifyAdmin, async (req, res) => {
      const tool = req.body;
      const result = await toolCollection.insertOne(tool);
      res.send(result);
    });


    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const order = req.body;
      const productPrice = order.productPrice;
      const amount = productPrice * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({ clientSecret: paymentIntent.client_secret })

    });


    app.delete('/tool/:name', verifyJWT, verifyAdmin, async (req, res) => {
      const name = req.params.name;
      const filter = { name: name };
      const result = await toolCollection.deleteOne(filter);
      res.send(result);
    });

  }
  finally {

  }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Screw Driver')
});

app.listen(port, () => {
  console.log(`Screw Driver app listening on port ${port}`)
})