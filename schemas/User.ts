import { Schema, model, Types, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface User extends Document {
  uri?: string
  name: string
  email: string
  customerKey?: string
  verified: boolean
  password: string
  verifiedToken: string
  passwordResetToken: string
  passwordResetExpires: Date
  emailVerifyCode: string
  emailVerifyExpires: Date
  roles: any[]
  expiredAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<User>({
  uri: String,
  // username: {
  //   type: String,
  //   unique: true,
  //   required: [true, "Username is a required field"],
  //   lowercase: true
  // },
  name: {
    type: String,
    required: [true, "Name is a required field"],
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email is a required field"],
    lowercase: true
  },
  customerKey: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    required: [true, 'Password is a required field'],
    select: false
  },
  verifiedToken: {
    type: String,
    default: Date.now as unknown as () => string
  },
  passwordResetToken: {
    type: String,
    default: Date.now as unknown as () => string
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  emailVerifyCode: { type: String },
  emailVerifyExpires: {
    type: Date,
    select: false
  },
  roles: [{
    type: Types.ObjectId,
    ref: 'Role'
  }],
  expiredAt: {
    type: Date,
    default: Date.now,
    // expires: '1m'
    expires: '2d'
  },
}, {
  timestamps: true,
})

// this is unique hook set error message code unique is 11000
UserSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.code === 11000) {
    next(new Error(`${JSON.stringify(error.keyValue)} must be unique has exists!`));
  } else {
    next(error);
  }
});

UserSchema.pre('save', async function(next) {
  if (this.get('password')) {
    const hash = await bcrypt.hash(this.get('password'), 10)
    this.set('password', hash)
  }

  next()
})

// UserSchema.path('username').validate(function(username) {
//   if (!(/^[a-zA-Z0-9._]{0,28}[\w]+$/).test(username)) {
//     throw new Error("Please enter a valid Username format!")
//   }
//   return true
// });

UserSchema.path('password').validate(function(password: string) {
  if (!(/^(?!.* )(?=.*\d)(?=.*[A-Z]).{8,15}$/).test(password)) {
    throw new Error("Your password must contain at least one uppercase character and be at least 8 to 15 characters long" )
  }
  return true
});

UserSchema.path('email').validate(function(email: string) {
  if (!(/\S+@\S+\.\S+/).test(email)) {
    throw new Error("Please enter a valid E-mail!" )
  }
  return true
});


export default model<User>('User', UserSchema, 'User')
