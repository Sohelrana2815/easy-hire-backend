const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5q2fm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware for verifyToken

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("Token in the middleware: ", token);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized!" });
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log(err);
      return res.status(401).send({ message: "Unauthorized" });
    }
    // console.log("Verified Token: ", decoded);
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersPostedJobsCollection = client
      .db("EASY_HIRE_DB")
      .collection("usersPostedJobs");

    // Create JWT token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
        })
        .send({ success: true });
    });

    app.post("/usersPostedJobs", async (req, res) => {
      const job = req.body;
      console.log(job);
      const result = await usersPostedJobsCollection.insertOne(job);
      res.send(result);
    });

    app.get("/allUsersJobs", async (req, res) => {
      const result = await usersPostedJobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/myPostedJobs", verifyToken, async (req, res) => {
      // console.log("verified token from middleware", req.decoded);
      // console.log("My token: ", req.cookies.token);

      if (req.query?.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access!" });
      }
      const email = req.query?.email;
      const query = { email };
      const result = await usersPostedJobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersPostedJobsCollection.findOne(filter);
      res.send(result);
    });

    app.patch("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const myPostedJob = req.body;
      console.log(myPostedJob, id);

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          jobTitle: myPostedJob.jobTitle,
          deadline: myPostedJob.deadline,
          description: myPostedJob.description,
          category: myPostedJob.category,
          minimumPrice: myPostedJob.minimumPrice,
          maximumPrice: myPostedJob.maximumPrice,
        },
      };

      const result = await usersPostedJobsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.delete("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersPostedJobsCollection.deleteOne(filter);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Portal is Running....");
});

app.listen(port, () => {
  console.log(`Job Portal is Running on port ${port}`);
});
