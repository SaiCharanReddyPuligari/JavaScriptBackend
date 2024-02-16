## YouTube Backend

**Backend with JavaScript and frameworks**

This is a `JavaScript Backend project` to understand the functionalities of `MongoDB` `Express.js` `Node.js` in detail.

---

Here are the key points of how I used the `MEN` stack and `NPM` packages to build it.

-   Node.js for the backend code and running the Express server inside the node.js environment.
-   MongoDB to store the data using CURD principles and retrieve the required data with aggregation pipelines.
-   JsonWebTokens to authenticate the users for both access and session cookies and tokens.
-   Implementing production level practices to learn full-stack development in the best way possible.

Checkout the [API Documentation(POSTMAN)](https://documenter.getpostman.com/view/31485938/2sA2r6Z5TL)

### Tech Stack:

### Node.js, MongoDB, Express.js, Cloudinary

#### User Management:

-   Registration, login, logout.
-   Account management (avatar, cover image, details, password)
-   Watch history, playlists, videos, likes, sunscribers, etc

#### Video Management:

-   Video upload and publishing.
-   Video search, sorting, and pagination.
-   Video updating and deletion.
-   Visibility control (publish/unpublish)

#### Tweet Management:

-   Tweet creation and publishing
-   Viewing user tweets
-   Updating and deleting tweets

#### Subscription Management:

-   Subscribing to channels
-   Viewing subscriber and subscribed channel lists

#### Playlist Management:

-   Creating, updating, and deleting playlists
-   Adding and removing videos from playlists
-   Viewing user playlists

#### Like Management:

-   Liking and unliking videos, comments, and tweets
-   Viewing liked videos

#### Comment Management:

-   Adding, updating, and deleting comments on videos

#### Dashboard:

-   Viewing channel statistics (views, subscribers, videos, likes)
-   List down uploaded videos, along with the stats

##### Remainder

Need to set up the .env file to fill the required fileds with values of MongoDB, Cloudinary, and other important files. Make a file in the root directory, and check out the env sample file to know more details.
