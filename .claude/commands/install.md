# Install & Prime

## Read
.env.example (never read .env)

## Read and Execute
.claude/commands/prime.md

## Run
- Think through each of these steps to make sure you don't miss anything.
- Install BE dependencies
- On a background process, run `./scripts/start.sh` with 'nohup' or a 'subshell' to start the server so you don't get stuck

## Report
- Output the work you've just done in a concise bullet point list.
- Instruct the user to fill out the root level ./.env based on .env.example. 
- If `./env` does not exist, instruct the user to fill out `./env` based on `./env.example`
- Mention the url of the application we can visit based on `scripts/start.sh`
- Mention: If you want to upload images to github during the review process setup cloudflare for public image access you can setup your cloudflare environment variables. See .env.example for the variables.