const express = require("express");
const app = express();
const cors = require("cors");
// ssl comarch start 
const SSLCommerzPayment = require('sslcommerz-lts')

// ssl comarch end 

require('dotenv').config();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjauaf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// ssl comarch start 
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS
const is_live = false //true for live, false for sandbox
// ssl comarch end 

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const allDataCollection = client.db("MediPlushDb").collection("AllData")
        const heartallDataCollection = client.db("MediPlushDb").collection("heartData")



        app.get('/AllData', async (req, res) => {
            const result = await allDataCollection.find().toArray();
            res.send(result);
        })


        // ssl comarch start 
        const tran_id = new ObjectId().toString();
        app.post('/heartData', async (req, res) => {
            const heartdata = await allDataCollection.findOne({ _id: new ObjectId(req.body.heartId) })

            const order = req.body;
            const data = {
                total_amount: heartdata?.Heart_price,
                currency: 'BDT',
                tran_id: tran_id, // use unique tran_id for each api call
                success_url: `http://localhost:5000/payment/success/${tran_id}`,
                fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: order?.Username,
                cus_email: order?.Useremail,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            console.log(data);
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                res.send({ url: GatewayPageURL });

                const finalOrder = {
                    heartdata,
                    paidStatus: false,
                    tranjectionId: tran_id,
                    cus_name: order?.Username,
                    cus_email: order?.Useremail,
                }
                const result =  heartallDataCollection.insertOne(finalOrder);

                console.log('Redirecting to: ', GatewayPageURL)
            });

            app.post("/payment/success/:tranId", async (req, res) => {
                console.log(req.params.tranId);
                const result = await heartallDataCollection.updateOne({ tranjectionId: req.params.tranId }, {
                    $set: {
                        paidStatus: true,
                    }
                });
                if (result.modifiedCount > 0) {
                    res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
                }
            });
            
            app.post('/payment/fail/:tranId',async (req, res)=>{
                const result = await heartallDataCollection.deleteOne({tranjectionId: req.params.tranId});
                if(result.deletedCount){
                    res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`);
                }
            });

        });

        // ssl comarch end 

        // Send a ping to confirm a successful connection

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("simple crud is running");
});

app.listen(port, () => {
    console.log(`simple crud is running on ${port}`);
})