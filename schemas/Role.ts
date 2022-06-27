import { Schema, model, Types, Document, ObjectId } from 'mongoose';
import { User } from './User';

const roles = require('../config/roles.json');
const descriptions = require('../config/descriptions.json');

export interface Role extends Document {
  name: string
  store: any
  users: ObjectId | User[]
}

const RoleSchema = new Schema<Role>({
  name: { 
    type: String,
    enum: Object.keys(roles),
    required: [true, "Name is a required field"],
  },
  store: {
    type: Types.ObjectId,
    ref: 'Store'
  },
  users: [{
    type: Types.ObjectId,
    ref: 'User'
  }],
}, {
  timestamps: true,
})

RoleSchema.path('name').validate(function(name: string) {
    if (!Object.keys(roles).includes(name)) {
      throw new Error("Your name not must contain in roles types." )
    }
    return true
});

RoleSchema.virtual('description').get(function() {
    return descriptions.roles[this.name]
});

RoleSchema.virtual('permissions').get(function() {
    return roles[this.name].map((permission: string) => ({
        name: permission,
        description: descriptions.permissions[permission]
    }))
});

export default model<Role>('Role', RoleSchema, 'Role')
