import { Databases, Client, Account } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') // Make sure to add your endpoint
    .setProject(process.env.APPWRITE_PROJECT_ID || '')

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };