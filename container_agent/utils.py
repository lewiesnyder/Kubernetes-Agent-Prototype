import inspect
import re
from typing import Callable, Dict

def docstring_to_openai_spec(func: Callable) -> Dict:
    """Convert a Python function's docstring to OpenAI function spec format.
    
    Args:
        func (Callable): The function to parse
        
    Returns:
        Dict: OpenAI function specification format
    """
    doc = inspect.getdoc(func)
    if not doc:
        return {}
    
    spec = {
        "type": "function",
        "function": {
                   "name": func.__name__,
        "description": "",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        },
        "returns": {} 
        }
    }
    
    # Split docstring into sections
    sections = re.split(r'\n\s*(Args|Returns|Raises|Examples|Note):\s*\n', doc)
    
    # Process description (everything before first section)
    spec['function']["description"] = sections[0].strip()
    
    # Process parameters
    if 'Args' in sections:
        args_index = sections.index('Args') + 1
        args_section = sections[args_index]
        for line in args_section.strip().split('\n'):
            match = re.match(r'\s*(\w+)\s*\(([\w\[\], ]+)\):\s*(.*)', line)
            items = None
            if match:
                name, type_, desc = match.groups()
                # Convert Python type hints to JSON schema types
                json_type = "string"
                if "int" in type_.lower():
                    json_type = "integer"
                elif "float" in type_.lower() or "number" in type_.lower():
                    json_type = "number"
                elif "bool" in type_.lower():
                    json_type = "boolean"
                elif "list" in type_.lower() or "array" in type_.lower():
                    json_type = "array"
                    # Extract element type for arrays
                    element_type = "string"  # Default to string
                    element_match = re.search(r'list\[(\w+)\]', type_)
                    if element_match:
                        elem_type = element_match.group(1).lower()
                        if "int" in elem_type:
                            element_type = "integer"
                        elif "float" in elem_type or "number" in elem_type:
                            element_type = "number"
                        elif "bool" in elem_type:
                            element_type = "boolean"
                        elif "dict" in elem_type or "object" in elem_type:
                            element_type = "object"
                        # Add items property for array type
                        items = {"type": element_type}
                elif "dict" in type_.lower() or "object" in type_.lower():
                    json_type = "object"

                spec['function']["parameters"]["properties"][name] = {
                    "type": json_type,
                    "description": desc.strip(),
                    **({"items": items} if items else {})
                }
                # Check if parameter is optional
                if "Optional" not in type_ and "optional" not in desc.lower():
                    spec['function']["parameters"]["required"].append(name)
    
    # Process return value
    if 'Returns' in sections:
        returns_index = sections.index('Returns') + 1
        returns_section = sections[returns_index].strip()
        spec['function']["returns"] = {
            "description": returns_section.split(':')[-1].strip()
        }
    
    return spec

def docstring_to_anthropic_spec(func: Callable) -> Dict:
    """Convert a Python function's docstring to Anthropic tool spec format.
    
    Args:
        func (Callable): The function to parse
        
    Returns:
        Dict: Anthropic function specification format
    """
    doc = inspect.getdoc(func)
    if not doc:
        return {}
    
    spec = {
        "name": func.__name__,
        "description": "",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        },
    }
    
    # Split docstring into sections
    sections = re.split(r'\n\s*(Args|Returns|Raises|Examples|Note):\s*\n', doc)
    
    # Process description (everything before first section)
    spec['description'] = sections[0].strip()
    
    # Process parameters
    if 'Args' in sections:
        args_index = sections.index('Args') + 1
        args_section = sections[args_index]
        for line in args_section.strip().split('\n'):
            match = re.match(r'\s*(\w+)\s*\(([\w\[\], ]+)\):\s*(.*)', line)
            items = None
            if match:
                name, type_, desc = match.groups()
                # Convert Python type hints to JSON schema types
                json_type = "string"
                if "int" in type_.lower():
                    json_type = "integer"
                elif "float" in type_.lower() or "number" in type_.lower():
                    json_type = "number"
                elif "bool" in type_.lower():
                    json_type = "boolean"
                elif "list" in type_.lower() or "array" in type_.lower():
                    json_type = "array"
                    # Extract element type for arrays
                    element_type = "string"  # Default to string
                    element_match = re.search(r'list\[(\w+)\]', type_)
                    if element_match:
                        elem_type = element_match.group(1).lower()
                        if "int" in elem_type:
                            element_type = "integer"
                        elif "float" in elem_type or "number" in elem_type:
                            element_type = "number"
                        elif "bool" in elem_type:
                            element_type = "boolean"
                        elif "dict" in elem_type or "object" in elem_type:
                            element_type = "object"
                        # Add items property for array type
                        items = {"type": element_type}
                elif "dict" in type_.lower() or "object" in type_.lower():
                    json_type = "object"
                
                spec["input_schema"]["properties"][name] = {
                    "type": json_type,
                    "description": desc.strip(),
                    **({"items": items} if items else {})
                }
                
                # Check if parameter is optional
                if "Optional" not in type_ and "optional" not in desc.lower():
                    spec['input_schema']["required"].append(name)
    
    # Process return value
    if 'Returns' in sections:
        returns_index = sections.index('Returns') + 1
        returns_section = sections[returns_index].strip()
        spec['description'] += f"\n\nReturns: {returns_section.split(':')[-1].strip()}"

        # spec["returns"]["description"] = returns_section.split(':')[-1].strip()
    
    return spec