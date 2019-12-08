## **FreeCodeCamp** - Information Security and Quality Assurance Projects

### Project Anonymous Message Board (learning project)

An API to manage a simple anonymous message board.

### Installation

Live version is installed on glitch.com
(https://s-projects18-fcc-65.glitch.me/)

One can create a new glitch-project and import it from github.
It's a node.js project so it can also be installed per console.

### Usage REST-Api

| METHOD | URL + PARMS          |  ARGS                            | STATUS RETURNED |  DATA RETURNED |
| ------ | -------------------- | -------------------------------- | --------------- | -------------- |
| POST   | /api/threads/{board} | text, delete_password, thread_id | 200, 400, 500   | new thread |
| POST   | /api/replies/{board} | text, delete_password, thread_id | 200, 400, 500   | thread with new reply |
| GET    | /api/threads/{board} | - | 200, 400, 500   | array of most recent 10 bumped threads with most recent 3 replies |
| GET    | /api/replies/{board}?thread_id={thread_id} | - | 200, 400, 500   | entire thread with all it's replies |
| DELETE | /api/threads/{board} | thread_id, delete_password | 200, 400, 500   | (delete thread completely) |
| DELETE | /api/replies/{board} | thread_id, reply_id, delete_password | 200, 400, 500   | (delete reply) |
| PUT    | /api/threads/{board} | thread_id | 200, 400, 500   | (report a thread) |
| PUT    | /api/replies/{board} | thread_id, reply_id | 200, 400, 500   | (report a reply) |

Schema of return data:

``` 
{
  data:[{...}],
  errors:[{details:...},
  meta: {details:...}]
} 
```

### Example return values
```
{"data":[{"_id":"5de4aab48be46c007ee7cc34","board":"abc","text":"abc","created_on":"2019-12-02T06:09:56.908Z","bumped_on":"2019-12-02T06:09:56.908Z","replys":[]}]}
```

``` 
{
  meta: {details:'success'}]
} 
```

``` 
{
  errors:[{details:'incorrect password'}]
} 
```