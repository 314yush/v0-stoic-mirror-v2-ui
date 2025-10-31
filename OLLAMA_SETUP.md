# Ollama Setup Guide

Ollama runs AI models locally on your machine, keeping your journal conversations completely private.

## Quick Setup

### 1. Install Ollama

**macOS:**
```bash
# Download from https://ollama.com/download
# Or use Homebrew:
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
- Download installer from https://ollama.com/download
- Run the installer

### 2. Start Ollama

**macOS/Linux:**
```bash
ollama serve
```

**Windows:**
- Ollama should start automatically after installation
- Or run it from the Start menu

The server will run on `http://localhost:11434` (default)

### 3. Download a Model

Once Ollama is running, download a model. We recommend **Gemma2** for journaling:

```bash
# Small, fast model (good for journaling)
ollama pull gemma2:3b

# Or larger, more capable model (better responses, slower)
ollama pull gemma2:9b

# Alternative: Llama 3.2 is also great
ollama pull llama3.2:3b
```

### 4. Verify It's Working

Test that Ollama is running and can generate responses:

```bash
ollama run gemma2:3b
```

Type something and see if it responds. Press Ctrl+D to exit.

## Using in the App

1. **Make sure Ollama is running** (step 2 above)
2. Open the Journal tab in the app
3. Click "Chat style" in the header
4. In the "Ollama Settings" section:
   - **Ollama URL**: `http://localhost:11434` (default, usually correct)
   - **Model**: `gemma2:3b` (or whatever model you downloaded)
5. Start chatting!

## Troubleshooting

### "Failed to connect to Ollama"

**Problem:** Ollama isn't running
**Solution:** 
```bash
ollama serve
```
Make sure it's running in a terminal window.

### "Model not found"

**Problem:** The model name in settings doesn't match what you downloaded
**Solution:**
1. Check what models you have: `ollama list`
2. Update the "Model" field in settings to match exactly (e.g., `gemma2:3b`, `llama3.2:3b`)

### Ollama running on different port

**Problem:** Changed the default port
**Solution:** Update "Ollama URL" in settings (e.g., `http://localhost:8080`)

### Slow responses

**Solution:** 
- Use a smaller model (`gemma2:3b` instead of `gemma2:9b`)
- Close other apps to free up RAM
- Consider using a faster model like `llama3.2:3b`

## Recommended Models for Journaling

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `gemma2:3b` | 2.5GB | Fast | Good | Quick, responsive conversations |
| `llama3.2:3b` | 2.2GB | Fast | Good | Balanced speed/quality |
| `gemma2:9b` | 5.4GB | Medium | Better | More thoughtful responses |
| `llama3.2:1b` | 1.3GB | Very Fast | Basic | Minimal hardware |

**Recommendation:** Start with `gemma2:3b` - it's fast and works well for journaling conversations.

## First Time Setup Summary

```bash
# 1. Install (macOS)
brew install ollama

# 2. Start server
ollama serve

# 3. In a NEW terminal, download model
ollama pull gemma2:3b

# 4. Verify it works
ollama run gemma2:3b
# Type "hello" and press Enter
# Press Ctrl+D to exit

# 5. Open the app and start journaling!
```

That's it! Once Ollama is running and you have a model downloaded, the app will connect automatically.
