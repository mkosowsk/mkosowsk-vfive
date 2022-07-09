const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sizeof = require('object-sizeof')
const isEqual = require('lodash.isequal');

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// keyed by user
const objects = {};

// get storage size for all objects per user in kilobytes
app.get('/objects', (req, res) => {
    const storageSizePerUserInKilobytes = fromEntries(
        Object.entries(objects)
            .map(([k, v]) => {
                // find storage size for all objects for a given user
                return [k, v.map(sizeof).reduce((a, b) => a + b)/1000 + ' kilobytes']
            })
        );
    
    return res.status(200).json(storageSizePerUserInKilobytes);
});

app.get('/users/:id/objects/:version?', (req, res) => {
    const user = req.params.id;
    const version = req.params.version;
    if (!objects[user]) return res.sendStatus(404);

    // use version if provided otherwise use latest object
    if (version) {
        if (!objects[user][version]) return res.sendStatus(404);
        return res.status(200).json(objects[user][version])
    } else {
        return res.status(200).json(objects[user][objects[user].length - 1]);
    }
});

app.post('/users/:id/objects', (req, res) => {
    const user = req.params.id;
    const { object } = req.body;

    // create user on objects if needed and create objects array for that user
    if (!objects[user]) objects[user] = [];

    // check all versions to see if we have seen this object before on the user
    // if not, add this new object
    let hasSeenObject = false;
    let hasSeenVersion;
    objects[user].forEach((userObject, index) => {
        if(isEqual(userObject, object)) {
            hasSeenObject = true;
            hasSeenVersion = index;
        }
    });

    if (!hasSeenObject) {
        const userObjectsLength = objects[user].length;
        objects[user].push(object);
        return res.status(200).send(`Object version ${userObjectsLength} has been added to user ${user}`);
    } else {
        return res.status(200).send(`Object already exists on user ${user} at version ${hasSeenVersion}`);
    }
});

app.delete('/users/:id/objects/:version?', (req, res) => {
    const user = req.params.id;
    const version = req.params.version;

    if (!objects[user]) return res.sendStatus(404);
    // if version is provided only delete that version
    // otherwise delete all versions
    if (version) {
        if (version > objects[user].length - 1) return res.sendStatus(404);
        objects[user].splice(version, 1)
        return res.status(200).send(`Object version ${version} for user ${user} has been deleted`);
    }
    else {
        delete objects[user];
        return res.status(200).send(`All objects for user ${user} have been deleted`);
    }
});

app.listen(port, () => console.log(`Listening on port ${port}`))

// polyfill of Object.fromEntries
function fromEntries (iterable) {
    return [...iterable].reduce((obj, [key, val]) => {
      obj[key] = val
      return obj
    }, {})
  }