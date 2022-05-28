
## API Documentation

#### Username Verify and Received Suggestions
if the username exists, it will be by assigning an array with name suggestions
```http
  GET /verify/username/:username
```

| Parameter   | Type       | Description                           |
| :---------- | :--------- | :---------------------------------- |
| `username` | `string` | **required**. Please enter a valid Username format! |


#### User Register/SignUp
Account verification post register action is required otherwise the user will be removed within 24 hours
```http
  POST /register
  POST /signup
```

| Body   | Type       | Description                           |
| :---------- | :--------- | :---------------------------------- |
| `username` | `string` | **required**. Please enter a valid Username format! |
| `email` | `string` | **required**. Please enter a valid Email format! |
| `password` | `string` | **required**. Please enter a valid Password format! |

#### User Verify

```http
  GET /verify/:token
```

| Parameter   | Type       | Description                           |
| :---------- | :--------- | :---------------------------------- |
| `token` | `string` | **required**. This token as provided in user `email` for register |

#### User Authenticate/SignIn

```http
  POST /authenticate
  POST /signin
```

| Body   | Type       | Description                                   |
| :---------- | :--------- | :------------------------------------------ |
| `identifier` | `string` | **optional**. this field refers to the unique means of identifying the user to login, ex: `email`, `username` ... |
| `username` | `string` | **optional case usage field email or identifier**. Please enter a valid Username format! |
| `email` | `string` | **optional case usage field username or identifier**. Please enter a valid Email format! |
| `password` | `string` | **required**. Please enter a valid Password format! |

#### User Reset Password

a `token` will be sent to the `email` of the identified user to be used in `POST /resetpass`

```http
  PUT /forgotpass/:identifier
```

| Parameter   | Type       | Description                                   |
| :---------- | :--------- | :------------------------------------------ |
| `identifier` | `string` | **required**. this field refers to the unique means of identifying the user to login, ex: `email`, `username` ... |


#### User Reset Password

the `token` to be used is provided by `PUT /forgotpass/:identifier` will be sent to your user `email`

```http
  POST /resetpass
```

| Body   | Type       | Description                                   |
| :---------- | :--------- | :------------------------------------------ |
| `token` | `string` | **required**. this field created existence in `GET /forgotpass/:identifier` get in user `email` |
| `password` | `string` | **required**. Please enter a valid Password format for created new `password`. |

