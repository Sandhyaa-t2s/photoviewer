//  api.js
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var ig = require('instagram-node').instagram();
var empty = require('is-empty');
var bcrypt = require('bcrypt');
var MongoClient = require('mongodb').MongoClient;
const port = process.env.PORT || 5000;
const saltRounds = 10;
var accessToken;
var output;            
// var client_id;
// = '765b0930dbca47f7b121fe3afb7244e4';
// var client_secret;
//= '765b0930dbca47f7b121fe3afb7244e4';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true }, (err, client) => {
    if (err) return console.log(err);
    db = client.db('photoviewer');
    console.log("Mongodb is opened.")
})

//location of our static files(css,js,etc..)
app.use(express.static(__dirname + '/public'));

//set the view engine to use ejs
app.set('view engine', 'ejs');

ig.use({
    client_id: '3d1e33a601944f11903cbed0eafc21bf',
    client_secret: '5d12753d9adf4bb7966141953cbfc76c'
});

//the redirect uri we set when registering our application
var redirectUri = 'http://localhost:5000/handleAuth';

// directing to the instagram authorization url
app.get('/authorize', function (req, res) {
// set the scope of our application to be able to access likes and public content
    res.redirect(ig.get_authorization_url(redirectUri, { scope: ['public_content', 'likes'] }));
});

// request the Access token
app.get('/handleAuth', function (req, res) {
    //retrieves the code that was passed along as a query to the '/handleAuth' route and uses this code to construct an access token
    ig.authorize_user(req.query.code, redirectUri, function (err, result) {
        if (err) res.send(err);
        // store this access_token in a global variable called accessToken
        accessToken = result.access_token;
        console.log('access token ', accessToken)
        // res.send(result)
        // After getting the access_token redirect to the '/' route 
        res.redirect('/photoviewer');
    });
})

// getting photos
app.get('/photoviewer', function (req, res) {
    // res.send("im in instagram")
    console.log("Getting photos")
    if (!empty(accessToken)) {
        console.log("hello world")
        // create a new instance of the use method which contains the access token gotten
        ig.use({
            access_token: accessToken
        });
        console.log(accessToken, accessToken.split('.')[0])

        ig.user_media_recent(accessToken.split('.')[0], function (err, result, pagination, remaining, limit) {
            if (err) res.json(err);
            output = result
            // res.send(result)
            // pass the json file gotten to our ejs template
            console.log("result = ", output)
            console.log("pagination = ", pagination)
            console.log("remaining = ", remaining)
            console.log("limit = ", limit)
            res.render('pages/dashboard', { instagram: result });
        });
    }
    else {
        console.log("hi")
        res.redirect('/')
    }
    // res.send(output)
});

app.get('/', (req, res) => {
    if (empty(accessToken)) {
        res.render('pages/userAuth')
    }
    else {
        res.redirect('/photoviewer')
    }

})
app.get('/registration', (req, res) => {
    res.render('pages/registration')
})
app.get('/logout', (req, res) => {
    res.render('pages/userAuth')
})


app.post('/signin', (req, res) => {
    console.log("SignIn Post Method call");
    console.log(req.body);
    let { username, password } = req.body;

    if (username !== " ") {
        let lastAtPos = username.lastIndexOf('@');
        let lastDotPos = username.lastIndexOf('.');
        if ((lastAtPos < lastDotPos && lastAtPos > 0 && username.indexOf('@@') === -1 && lastDotPos > 2 && (username.length - lastDotPos) > 2)) {
            if (password.length >= 8) {
                if (password.match(/^((.*[a-z])(.*[0-9]))|((.*[0-9])(.*[a-z]))+$/)) {
                    db.collection('login').findOne({ username }, (err, result) => {
                        if (err) {
                            console.log(err)
                            res.json({
                                message: err,
                                status: false
                            })
                        } else {
                            console.log(result)
                            if (!empty(result)) {
                                bcrypt.compare(password, result.password, function (err, hash) {
                                    // res == true   

                                    console.log("password match : ", hash)
                                    if (hash === true) {
                                        //  res.json({                            // token,            
                                        //     name: result.name,
                                        //     message: "Admin is Logged in Successfully",
                                        //     status: true
                                        //  })
                                        console.log("Login Successfull")
                                        res.redirect('https://api.instagram.com/oauth/authorize/?client_id=3d1e33a601944f11903cbed0eafc21bf&redirect_uri=http://localhost:5000/handleAuth&response_type=code')
                                        //alert("Login Successfull")
                                    } else {
                                        console.log("*Password is incorrect")
                                        // res.json({
                                        //     message: "*Password is incorrect",
                                        //     status: false
                                        // })
                                        //alert("*Password is incorrect")
                                        res.render('pages/userAuth', {
                                            error: {
                                                password: ""
                                            }
                                        })
                                    }
                                })
                            } else {
                                console.log("*Username is invalid.")
                                // res.json({
                                //     message: "*Username is invalid",
                                //     status: false
                                // })
                                // alert("*Username is invalid.")
                                res.render('pages/userAuth')
                            }
                        }
                    })
                } else {
                    console.log("*Password Should be Alpanumeric");
                    // alert("*Password Should be Alpanumeric");
                    res.render('pages/userAuth');
                }
            } else {
                console.log("*Password should atleast have 8 characters");
                // alert("*Password should atleast have 8 characters");
                res.render('pages/userAuth');
            }
        } else {
            //alert("*Username is not valid");
            console.log("*Username is not valid");
            res.render('pages/userAuth');
        }
    } else {
        console.log("*Username Cannot be empty");
        //alert("*Username Cannot be empty");
        res.render('pages/userAuth');
    }
})
app.post('/signup', (req, res) => {
    console.log("Signup Post Method call");
    console.log(req.body);
    let { name, username, password, client_id, client_secret } = req.body;
    db.collection('login').findOne({ username }, (err, result) => {
        if (err) {
            console.log(err)
            res.json({
                message: err,
                status: false
            })
        }
        else {
            console.log(result);
            if (empty(result)) {
                bcrypt.hash(password, saltRounds, function (err, hash) {
                    // Store hash in your password DB.      
                    db.collection('login').save({ name, username, password: hash, client_id, client_secret }, (err, result) => {
                        if (err) {
                            console.log(err)
                        }
                        else {
                            console.log('saved to database')
                            // res.json({                            
                            //     message: "Signed Up Successfully.",            
                            //     status: true                  
                            // })                     
                            res.redirect('/')
                        }
                    })
                });
            } else {
                console.log("*Username is already exists.")
                // res.json({                   
                // message: "*Username is already exists.",    
                //     status: false             
                // })                
                res.redirect('/registration')
            }
        }
    })
})




app.listen(port, () => console.log(`Listening on port ${port}`));
// app.listen(5000);

//  code=1ce4e869dd284caeb625d4c701f14ba4
// access_token=8233048293.ab8ee4f.563e9715ebfb4fc48cffe0af90595ff4

































