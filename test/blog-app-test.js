const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');

chai.use(chaiHttp);


function seedBlogData() {
    console.log('seeding blog data');
    const seedData = [];

    for (let i = 0; i <= 10; i++) {
        seedData[i] = generateBlogData();
    }
    return BlogPost.insertMany(seedData);
};

function generateAuthorName() {
    return {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    }
};

function generateTitle() {
    return faker.lorem.word();
};

function generateContent() {
    return faker.lorem.paragraphs();
};

function generateCreated() {
    return faker.date.past();
};

function generateBlogData() {
    return {
        author: generateAuthorName(),
        title: generateTitle(),
        content: generateContent(),
        created: generateCreated(),
    }
};

function tearDownDB() {
    return new Promise((resolve, reject) => {
        console.warn('delete database');
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
}

tearDownDB();

describe('Blog API resource', function () {

    before(function () {
        return runServer();
    });

    beforeEach(function () {
        return seedBlogData();
    });

    after(function () {
        return closeServer();
    });

    afterEach(function () {
        return tearDownDB();
    });


    describe('GET endpoint', function () {
        it('should get all blogs in databse', function () {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function (_res){
                    res = _res;
                    res.should.have.status(200);
                    res.body.should.have.length.of.at.least(1);
                    return BlogPost.count();
                })
                .then(function (count){
                    res.body.should.have.length.of(count);
                });
        });
   

        it('should return blogs with the right fields', function () {
            let resBlogs;
            return chai.request(app)
                .get('/posts')
                .then(function (res){
                    res.body.should.have.length.of.at.least(1);
                    res.body.should.be.a('array');
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.forEach(function(post){
                        post.should.be.a('object');
                        post.should.have.keys('author', 'title', 'content', 'created', 'id');
                    });
                    resBlogs = res.body[0];
                    return BlogPost.findById(resBlogs.id);
                })
                .then(function (post){
                    let authorName = `${post.author.firstName} ${post.author.lastName}`.trim();
                    post.authorName = authorName;
                    resBlogs.id.should.equal(post.id);
                    resBlogs.author.should.equal(post.authorName);
                    resBlogs.content.should.equal(post.content);
                });
        });
    });
    
    describe('POST Endpoint', function() {
        it('should add a new blog post', function () {
        const newBlogPost = {
          title: faker.lorem.sentence(),
          author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
          },
          content: faker.lorem.text()
      };
        return chai.request(app)
            .post('/posts')
            .send(newBlogPost)
            .then(function (res){
                let authorName = `${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`.trim();
                newBlogPost.authorName = authorName;
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.a('object');
                res.body.should.include.keys('author', 'title', 'content', 'created');
                res.body.author.should.equal(newBlogPost.authorName);
                res.body.title.should.equal(newBlogPost.title);
                res.body.content.should.equal(newBlogPost.content);
                return BlogPost.findById(res.body.id)
                .exec();
            })
            .then(function (post){
                post.author.firstName.should.equal(newBlogPost.author.firstName);
                post.author.lastName.should.equal(newBlogPost.author.lastName);
                post.title.should.equal(newBlogPost.title);
                post.content.should.equal(newBlogPost.content);
            });
        });
    });

    describe('PUT endpoint', function() {
        it('should update a blog post', function () { 
        const updatedBlogPost = {
            name: generateAuthorName(),
            content: generateContent()
        }
        
        BlogPost.findOne()
            .then(function (post){
                updatedBlogPost.id = post.id

                return chai.request(app)
                    .put(`/posts/${post.id}`)
                    .send(updatedBlogPost)     
            })
            .then(function (res){
                res.should.have.status(204);
                res.should.be.json;
                return BlogPost.findById(updatedBlogPost.id)
                .exec();
            })
            .then(function(post){
                post.name.should.equal(updatedBlogPost.name)
                post.content.should.equal(updatedBlogPost.content)
            });
        });
    });
 
describe('DELETE endpoint', function() {
    // strategy:
    //  1. get a restaurant
    //  2. make a DELETE request for that restaurant's id
    //  3. assert that response has right status code
    //  4. prove that restaurant with the id doesn't exist in db anymore
    it('delete a blog post by id', function() {

      let blogPost;

      return BlogPost
        .findOne()
        .exec()
        .then(function(_blogPost) {
          blogPost = _blogPost;
          return chai.request(app).delete(`/posts/${blogPost.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(blogPost.id);
        })
        .then(function(_blogPost) {
          should.not.exist(_blogPost);
        });
    });
  });

});