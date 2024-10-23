const express = require('express')
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const userModel = require('./models/user');
const postModel = require('./models/post');
const uploads = require('./config/multerConfig');
const path = require('path');
const upload = require('./config/multerConfig');

app.set('view engine', "ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());


app.get('/', function(req, res) {
    res.render('index')
});

app.get('/profile/upload', function(req, res) {
    res.render('profileupload')
});



app.get('/login', function(req, res) {
    res.render('login')
})

app.post('/post',  isLoggedIn,  async function(req, res) {
    let user = await userModel.findOne({email:req.user.email});
    let {content} = req.body;
    let post = await postModel.create({
        user: user._id,
        content: content,
        likes: []
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
})

app.get('/profile',  isLoggedIn, async function(req, res) {
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    console.log(user);
    res.render('profile', {user});
})

app.post('/upload', isLoggedIn, upload.single('image'), async function(req, res) {
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile')
});

app.get('/edit/:id',  isLoggedIn, async function(req, res) {
    let post = await postModel.findOne({_id: req.params.id});
    res.render('edit', {post});
});

app.post('/update/:id',  isLoggedIn, async function(req, res) {
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
    res.redirect('/profile');
});

app.get('/like/:id',  isLoggedIn, async function(req, res) {
    let post = await postModel.findOne({_id: req.params.id});
     if (!post.likes) {
        post.likes = []; // Ensure likes is an array
    }
    if(post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid)
    }else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/profile');
});

app.post('/login',async function(req, res) {
    let { email, password} = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send('Something went wrong');
    bcrypt.compare(password, user.password, (err, result) => {
        if(result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie('token', token);
            res.redirect('/profile');
        }else {
            res.redirect('/login');
        }
    })
})

app.post('/register', async function (req, res) {
    let { email, password, age, name, username } = req.body;

    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send('User is already registered');

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let User = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            });

            let token = jwt.sign({ email: email, userid: User._id }, "shhhh");
            res.cookie('token', token);
            res.redirect('/profile');
        });
    });
});

app.get('/logout', function(req, res) {
    res.cookie("token", "");
    res.redirect('/login');
})

function isLoggedIn(req, res, next) {
    if(req.cookies.token === "") res.redirect('/login');
    else {
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;
        next();
    }
}

app.listen(3000)