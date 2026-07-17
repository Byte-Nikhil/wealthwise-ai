import json
import google.generativeai as genai
from backend.app.core.config import settings

def extract_receipt_details(image_bytes: bytes, mime_type: str) -> dict:
    """
    Extract structured receipt details from image bytes using Gemini 1.5 Flash vision capability.
    """
    try:
        # Configure Gemini API
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = (
            "You are an expert receipt parser. Analyze this receipt photo and extract key information. "
            "Return a JSON object with the following fields: "
            "'merchant' (string, name of the shop/restaurant/utility company), "
            "'amount' (float, total transaction amount), "
            "'date' (string, date of the transaction in YYYY-MM-DD format. If date is not clear, use current date), "
            "'category' (string, select exactly one of: Food, Travel, Shopping, Bills, Medical, Entertainment, Education, Others). "
            "Return ONLY the raw JSON string. Do not include any markdown styling, code blocks like ```json, or leading/trailing text."
        )
        
        response = model.generate_content([
            {
                "mime_type": mime_type,
                "data": image_bytes
            },
            prompt
        ])
        
        # Clean response string of code blocks if any
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("\n", 1)[0]
        text = text.strip("` \n\r\t")
        
        # Parse JSON
        parsed = json.loads(text)
        return {
            "merchant": parsed.get("merchant", "Receipt Purchase"),
            "amount": float(parsed.get("amount", 0.0)),
            "date": parsed.get("date", ""),
            "category": parsed.get("category", "Others")
        }
    except Exception as e:
        print(f"Receipt OCR extraction failed: {e}")
        # Return empty template on failure to let user fill details manually
        return {
            "merchant": "",
            "amount": 0.0,
            "date": "",
            "category": "Others",
            "error": str(e)
        }
