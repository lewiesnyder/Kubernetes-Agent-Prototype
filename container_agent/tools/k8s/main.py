import asyncio
import logging
from typing import AsyncGenerator, Optional
import uuid

from container_agent.tools.k8s.k8sTool import K8sTool

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


async def execute_python_in_k8s(code: str, dependencies: Optional[list[str]] = []) -> AsyncGenerator[str, None]:
    """
    Execute python code in a kubernetes pod and stream back the the stdout and stderr. If the python code produces a image, graph, chart, or any other file output. 
    The output must be a dataurl if the final product of the code is a file.
    Args:
        code (str): The code to solve the request's complex task that an agent or LLM cannot do on its own. Always wrap the final output in with the delimiter: %%START_OUTPUT%% and %%END_OUTPUT%%. Examples: %%START_OUTPUT%%data:image/png,%89PNG%0D%0A...%%END_OUTPUT%% or %%START_OUTPUT%%Hello, world!%%END_OUTPUT%%
        dependencies (Optional[list[str]]): The dependencies to install in the pod required for the code to run. Only include dependencies that are required for the code to run. Always include the version of the dependency to ensure that the code will run. Pay close attention to dependency versions.
    Returns: 
        AsyncGenerator[str, None]: A generator yielding the output events of the python code as they occur. Non-text output will be a dataurl for the file. Always wrap the final output in with the delimiter: %%START_OUTPUT%% and %%END_OUTPUT%%. Examples: %%START_OUTPUT%%data:image/png,%89PNG%0D%0A...%%END_OUTPUT%% or %%START_OUTPUT%%Hello, world!%%END_OUTPUT%%

    """
    pod = K8sTool.create_pod(ns="agent-runtime", pod_name=f"agentic-runner-{uuid.uuid4()}", pod_spec=K8sTool.default_pod_spec)
    
    try:
        K8sTool.wait_for_pod(ns=pod.metadata.namespace, pod_name=pod.metadata.name)
        
        if dependencies:
            async for event in K8sTool.install_dependencies_async(ns=pod.metadata.namespace, pod_name=pod.metadata.name, libraries=dependencies):
                yield event

        async for event in K8sTool.execute_python_async(ns=pod.metadata.namespace, pod_name=pod.metadata.name, python_code=code):
            yield event
            
    finally:
        K8sTool.terminate_pod(ns=pod.metadata.namespace, pod_name=pod.metadata.name)
        