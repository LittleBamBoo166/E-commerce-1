// importing packages
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const path = require('path');

// firebase admin setup

let serviceAccount = require("./e-commerce-website-30f93-firebase-adminsdk-nql5d-3db235ca02.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

// aws config
const aws = require('aws-sdk');
const dotenv = require('dotenv');

dotenv.config();

// aws parameters
const region = "us-west-2";
const bucketName = "my-first-ecom-website-123321";
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

aws.config.update({
    region: region,
    accessKeyId: accessKeyId,
    accessSecretKey: secretAccessKey,
})

// init s3
const s3 = new aws.S3({
    signatureVersion: 'v4'
});

// generate image upload link
async function generateUrl() {
    let date = new Date();
    let id = parseInt(Math.random() * 10000000000);

    const imageName = `${id}${date.getTime()}.jpg`;

    const params = ({
        Bucket: bucketName,
        Key: imageName,
        Expires: 300, // 300 ms
        ContentType: 'image/jpeg'
    })
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    return uploadUrl;
}

// declare static path
let staticPath = path.join(__dirname, "public");

//intializing express.js
const app = express();

//middlewares
app.use(express.static(staticPath));
app.use(express.json());

// routes
// home route
app.get("/", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
})

// signup route
app.get('/signup', (req, res) => {
    res.sendFile(path.join(staticPath, "signup.html"));
})

app.post('/signup', (req, res) => {
    let { name, email, password, number, tac, notification } = req.body;

    // form validations
    if (name.length < 3) {
        return res.json({ 'alert': 'name must be 3 letters long' });
    } else if (!email.length) {
        return res.json({ 'alert': 'enter your email' });
    } else if (password.length < 8) {
        return res.json({ 'alert': 'enter your phone number' });
    } else if (!Number(number) || number.length < 10) {
        return res.json({ 'alert': 'invalid number, please enter valid one' });
    } else if (!tac) {
        return res.json({ 'alert': 'you must agree to our terms and conditions' });
    }

    // store user in db
    db.collection('users').doc(email).get().then(user => {
        if (user.exists) {
            return res.json({ 'alert': 'email already exists' });
        } else {
            // encrypt the password before storing it
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(password, salt, (err, hash) => {
                    req.body.password = hash;
                    db.collection('users').doc(email).set(req.body).then(data => {
                        res.json({
                            name: req.body.name,
                            email: req.body.email,
                            seller: req.body.seller,
                        })
                    })
                })
            })
        }
    })
})

// login route
app.get('/login', (req, res) => {
    res.sendFile(path.join(staticPath, "login.html"));
})

app.post('/login', (req, res) => {
    let { email, password } = req.body;

    if (!email.length || !password.length) {
        return res.json({ 'alert': 'fill all the inputs' });
    }

    db.collection('users').doc(email).get().then(user => {
        if (!user.exists) { // if email does not exist
            return res.json({ 'alert': 'log in email does not exist' });
        } else {
            bcrypt.compare(password, user.data().password, (err, result) => {
                if (result) {
                    let data = user.data();
                    return res.json({
                        name: data.name,
                        email: data.email,
                        seller: data.seller,
                    })
                } else {
                    return res.json({ 'alert': 'password is incorrect' });
                }
            })
        }
    })
})

// seller route
app.get('/seller', (req, res) => {
    res.sendFile(path.join(staticPath, "seller.html"));
})
app.post('/seller', (req, res) => {
    let { name, about, address, number, tac, legit, email } = req.body;
    if (!name.length || !about.length || !address.length || number.length < 10 || !Number(number)) {
        return res.json({ 'alert': 'some information(s) is/are invalid.' });
    } else if (!tac || !legit) {
        return res.json({ 'alert': 'you must agree to our terms and conditions' });
    } else {
        // update users status here.
        db.collection('sellers').doc(email).set(req.body).then(data => {
            db.collection('users').doc(email).update({
                seller: true
            }).then(data => {
                res.json(true);
            })
        })
    }
})

// add product
app.get('/add-product', (req, res) => {
    res.sendFile(path.join(staticPath, "addProduct.html"));
})

app.get('/product', (req, res) => {
    res.sendFile(path.join(staticPath, "product.html"));
})

// get the upload link
app.get('/s3url', (req, res) => {
    generateUrl().then(url => res.json(url));
})

// add product
app.post('/add-product', (req, res) => {
    let { name, shortDes, des, images, sizes, actualPrice, discount, sellPrice, stock, tags, tac, email } = req.body;

    // validation
    if (!name.length) {
        return res.json({ 'alert': 'please enter the product name' });
    } else if (shortDes.value.length > 100 || shortLine.value.length < 10) {
        return res.json({ 'alert': 'short description must be between 10 to 100 letters long' });
    } else if (!des.value.length) {
        return res.json({ 'alert': 'please enter the detail description about the product' });
    } else if (!images.length) {
        return res.json({ 'alert': 'please upload at least one image of the product' });
    } else if (!sizes.length) {
        return res.json({ 'alert': 'please select at least one size' });
    } else if (!actualPrice.value.length || !discount.value.length || !sellPrice.value.length) {
        return res.json({ 'alert': 'you must add pricings' });
    } else if (stock.value < 20) {
        return res.json({ 'alert': 'you must have at least 20 items in the stock' });
    } else if (!tags.value.length) {
        return res.json({ 'alert': 'enter few tags to help ranking your product in search' });
    } else if (!tac.checked) {
        return res.json({ 'alert': 'you must agree to our terms and conditions' });
    }

    // add product
    let docName = `${name.toLowerCase()}-${Math.floor(Math.random() * 5000)}`;
    db.collection('products').doc(docName).set(req.body).then(data => {
        res.json({'product': name});
    }).catch(err => {
        return res.json({'alert': 'some error occured. Try again'});
    })
})

// 404 route
app.get("/404", (req, res) => {
    res.sendFile(path.join(staticPath, "404.html"));
})
app.use((req, res) => {
    res.redirect('/404');
})

app.listen(3000, () => {
    console.log('listening on port 3000........');
})

