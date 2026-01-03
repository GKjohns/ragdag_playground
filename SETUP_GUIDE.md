# RAGDAG Playground Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

The RAGDAG Playground can run in two modes:
- **AI Mode**: Uses real OpenAI API for dynamic plan generation
- **Simulation Mode**: Uses simulated responses without API calls

#### To Enable AI Mode:

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

2. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

3. Add your API key to the `.env` file:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

#### To Use Simulation Mode:

Simply run the app without setting an API key, or set:
```env
OPENAI_API_KEY=SIMULATION_MODE
```

### 3. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Features

### AI Mode (with API Key)
- Dynamically generates execution plans based on your goals
- Uses GPT-4o for intelligent plan creation
- Adapts plans to your specific input and requirements
- Real-time execution with actual AI responses

### Simulation Mode (without API Key)
- Test the interface without API costs
- Pre-generated intelligent responses
- Good for development and testing
- Simulated execution results

## API Key Status Indicator

The app shows your current mode in the header:
- 🌟 **AI Mode**: Real OpenAI API is active
- 🧪 **Simulation Mode**: Using simulated responses

## Troubleshooting

### "Invalid schema" Error
If you see this error, make sure you have the latest version of the code. The schema has been fixed to include all required fields.

### API Key Not Working
1. Verify your API key is valid
2. Check that you have credits in your OpenAI account
3. Ensure the `.env` file is in the project root
4. Restart the dev server after adding the API key

### Rate Limits
If you hit rate limits, the app will automatically fall back to simulation mode for that request.

## Example Usage

1. Click "Load Example" to load the Pineapple Crisis investigation
2. Click "Generate Plan" to create an AI-powered execution plan
3. Review the generated plan in the visualization
4. Click "Execute Plan" to run the analysis
5. View results and artifacts from each step

## Cost Considerations

- Plan generation uses GPT-4o (more expensive but better quality)
- Execution steps use GPT-3.5-turbo by default (cost-effective)
- You can edit the plan JSON to change models per node
- Typical execution costs: $0.01-0.05 per full run

## Development

To extend the playground:
- Add new executors in `/server/utils/ragdag/executors/`
- Modify plan generation logic in `/server/utils/ragdag/planner.ts`
- Customize the UI in `/app/pages/index.vue`