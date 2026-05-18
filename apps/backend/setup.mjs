import fs from 'fs-extra'
import dotenv from 'dotenv'
import path from 'path'
import { nanoid } from 'nanoid'
import { input, password } from '@inquirer/prompts';
import bcrypt from 'bcrypt';

const envPath = path.resolve(process.cwd(), ".env")
console.log(envPath)

if(fs.existsSync(envPath) == false){
    fs.createFileSync(envPath)
}

function makeExistingValidator(message) {
    return (input) => {
        if(input == null || input.trim().length == 0){
            return message
        }else{
            return true
        }
    }
}

const VITE_BLACKLISTS = ["OPENAI_API_KEY", "AUTH_SECRET", "MONGODB_URL", "MONGODB_DBNAME", "ADMIN_ID", "ADMIN_HASHED_PW"]

async function hashPassword(password){
    let hp = await bcrypt.hash(password.trim(), 10)
    console.log(hp)
    return hp
}

async function setup(){
    const env = dotenv.config({path: envPath})?.parsed || {}
 

    console.log(env, env["BACKEND_PORT"])

    const answers = {
        "BACKEND_PORT": env["BACKEND_PORT"] || '3000',
        "BACKEND_HOSTNAME": env["BACKEND_HOSTNAME"] || '0.0.0.0',
        "AUTH_SECRET": env["AUTH_SECRET"] || 'NaverAILabHCIELMI',
        "MONGODB_URL": env["MONGODB_URL"] || 'mongodb://localhost:27017/',
        "MONGODB_DBNAME": env["MONGODB_DBNAME"] || 'exploreself',
        "OPENAI_API_KEY": env["OPENAI_API_KEY"] || 'test_key',
        "ADMIN_HASHED_PW": env["ADMIN_HASHED_PW"] || await hashPassword('123456'), // 默认管理员密码设为 123456
        "ADMIN_ID": env["ADMIN_ID"] || nanoid()
    }

    for(const key of Object.keys(answers)){
        if(key.startsWith("VITE_") == false && VITE_BLACKLISTS.indexOf(key) === -1){
            answers[`VITE_${key}`] = answers[key]
        }
    }

    const envFileContent = Object.entries(answers)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync(envPath, envFileContent, {encoding:'utf-8'})

    fs.copyFileSync(envPath, path.join(process.cwd(), "apps/frontend-web", ".env"))
}

setup().then()