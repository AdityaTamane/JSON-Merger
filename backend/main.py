from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Union, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MergeRequest(BaseModel):
    jsons: List[Union[Dict[str, Any], List[Dict[str, Any]]]]
    override: bool = True

def merge_json(json1, json2, override=True):
    if isinstance(json1, list) and isinstance(json2, list):
        return json1 + json2

    if isinstance(json1, dict) and isinstance(json2, dict):
        result = dict(json1)
        for key, value in json2.items():
            if key in result:
                result[key] = merge_json(result[key], value, override)
            else:
                result[key] = value
        return result
    return json2 if override else json1

@app.post("/merge-json")
def merge_json_endpoint(data: MergeRequest):
    merged = data.jsons[0]
    for json_data in data.jsons[1:]:
        merged = merge_json(merged, json_data, data.override)
    return {"merged": merged}
