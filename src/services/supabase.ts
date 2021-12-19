import { createClient } from '@supabase/supabase-js';
import { User } from '../models/user';

const supabase = createClient(
  'https://vdumpguhqkmszcemyucv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzOTYwMDk5OSwiZXhwIjoxOTU1MTc2OTk5fQ.vA_kF94FhAnJEt4FsVhoDzZqoW_b3K5fgrP7l1fOIkM'
);

//const {data:users} = await supabase.from('users').insert([{name: "teste", number: "8767567656575"}])

//console.log(users);

export async function insertUser(user: User) {  
  try {
    const { data: newUser } = await supabase.from<User>('users').insert([user]);   

    return newUser ?? null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function findUser(user: User) {  
  try {
    const { data: foundUser } = await supabase
      .from<User>('users')
      .select('*')
      .match({ number: user.number });

    return foundUser ?? null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function updateUser(user: User) {  
  try {
    const { data: updatedUser } = await supabase
      .from<User>('users')
      .update(user)
      .match({ number: user.number });

    return updatedUser ?? null;
  } catch (error) {
    console.log(error);
    return null;
  }
}
