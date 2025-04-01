import logging
import time
from typing import AsyncGenerator

from kubernetes import client, config, stream
from kubernetes.client.models.v1_pod import V1Pod

# TODO: refactor to agent to remove all occurances before sending to UI
_start_delimiter = '%%START_OUTPUT%%'
_end_delimiter = '%%END_OUTPUT%%'

class K8sTool:
    """
    A tool for interacting with a kubernetes cluster.
    """

    logger = logging.getLogger(__name__)

    default_pod_spec = {
        "containers": [{
            "name": "agent-runner",
            # "image": "python:3.11",
            "image": "jupyter/datascience-notebook",
            "command": ['sleep', 'infinity']
        }],
        "restartPolicy": "Always"
    }


    @staticmethod
    def _get_client() -> client.CoreV1Api:
        """
        Get a client for the kubernetes cluster
        """
        config.load_kube_config()
        return client.CoreV1Api()


    @staticmethod
    def create_pod(pod_name: str, pod_spec: dict, ns: str = 'default') -> V1Pod:
        """
        Create a pod in the cluster.

        Args:
            pod_name (str): The name of the pod to create.
            pod_spec (dict): The specification for the pod.
            ns (str): The namespace to create the pod in.

        Returns:
            V1Pod: The created pod.
        """
        client = K8sTool._get_client()
        K8sTool.logger.info(f"Creating pod {pod_name} in namespace {ns}")

        pod_manifest = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {
                "name": pod_name,
                "namespace": ns
            },
            "spec": pod_spec if pod_spec else K8sTool.default_pod_spec
        }

        K8sTool.logger.info(f"Creating pod {pod_name} in namespace {ns}")

        client.create_namespaced_pod(namespace=ns, body=pod_manifest)
        pod: V1Pod = K8sTool.wait_for_pod(pod_name=pod_name, ns=ns)
       
        K8sTool.logger.info(f"Pod {pod_name} created in {ns}")

        return pod
    

    @staticmethod
    def wait_for_pod(pod_name: str, ns: str = 'default') -> V1Pod:
        """
        Wait for a pod to be ready.

        Args:
            pod_name (str): The name of the pod to wait for.
            ns (str): The namespace of the pod to wait for.

        Returns:
            V1Pod: The pod that is ready.
        """
        client = K8sTool._get_client()
        while True:
            pod: V1Pod = client.read_namespaced_pod(name=pod_name, namespace=ns)
            if pod.status.phase == 'Running':
                K8sTool.logger.info(f"Pod {pod_name} is ready in {ns}")
                return pod 
            elif pod.status.phase == 'Succeeded':
                K8sTool.logger.info(f"Pod {pod_name} succeeded in {ns}")
                return pod
            elif pod.status.phase == 'Failed':
                K8sTool.logger.error(f"Pod {pod_name} failed in {ns}")
                raise Exception(f"Pod {pod_name} failed in {ns}")
            else:
                K8sTool.logger.info(f"Pod {pod_name} is {pod.status.phase} in {ns}")
                time.sleep(1)

                
    @staticmethod
    async def execute_command_async(pod_name: str, exec_cmd: list[str], ns: str = 'default') -> AsyncGenerator[dict, None]:
        """
        Asynchronously execute a command in a pod and stream back stdout/stderr events asynchronously.

        Args:
            pod_name (str): The name of the pod to execute the command in.
            exec_cmd (list[str]): The command to execute.
            ns (str): The namespace of the pod to execute the command in.

        Yields:
            dict: Event containing either stdout or stderr data with format:
                 {"type": "stdout"|"stderr", "data": str}
        """
        K8sTool.logger.info(f"Executing command stream in pod {pod_name}")

        client = K8sTool._get_client()
        try:
            response = stream.stream(client.connect_get_namespaced_pod_exec,
                                   name=pod_name,
                                   namespace=ns,
                                   command=exec_cmd,
                                   stderr=True,
                                   stdin=False,
                                   stdout=True,
                                   tty=False,
                                   _preload_content=False)

            while response.is_open():
                response.update(timeout=1)
                if response.peek_stderr():
                    yield {"type": "stderr", "data": response.read_stderr()}
                if response.peek_stdout():
                    yield {"type": "stdout", "data": response.read_stdout()}

            response.close()

        except Exception as e:
            K8sTool.logger.error(f"Error executing command stream in pod {pod_name}: {e}")
            raise e
        

    @staticmethod
    def execute_command(pod_name: str, exec_cmd: list[str], ns: str = 'default') -> str:
        """
        Execute a command in a pod.

        Args:
            pod_name (str): The name of the pod to execute the command in.
            exec_cmd (list[str]): The command to execute.
            ns (str): The namespace of the pod to execute the command in.

        Returns:
            str: The output of the command.
        """
        K8sTool.logger.info(f"Executing command in pod {pod_name}")

        client = K8sTool._get_client()
        try:
            response = stream.stream(client.connect_get_namespaced_pod_exec,
                                     name=pod_name,
                                     namespace=ns,
                                     command=exec_cmd, 
                                     stderr=True,
                                     stdin=False,
                                     stdout=True,
                                     tty=False,
                                     _preload_content=False)
            
            stdout: list[str] = []
            stderr: list[str] = []

            while response.is_open():
                response.update(timeout=1)
                if response.peek_stderr():
                    stderr.append(response.read_stderr())
                if response.peek_stdout():
                    stdout.append(response.read_stdout())
            
            response.close()

            if len(stderr) > 0:
                K8sTool.logger.error(f"Command {exec_cmd} failed in pod {pod_name} with error: {stderr}")
                # raise Exception(f"Command {exec_cmd} failed in pod {pod_name} with error: {stderr}")
            
            return ''.join(stdout)
        except Exception as e:
            K8sTool.logger.error(f"Error executing command in pod {pod_name}: {e}")
            raise e
                    

    @staticmethod
    def execute_python(pod_name: str, python_code: str, ns: str = 'default') -> str:
        """
        Execute python code in a pod.

        Args:
            pod_name (str): The name of the pod to execute the python code in.
            python_code (str): The python code to execute.
        """
        K8sTool.logger.info(f"Executing python code in pod {pod_name}")
        escaped = python_code.replace("'", "\\'")
        exec_cmd = ['python', '-c', f'{escaped}']
        return K8sTool.execute_command(pod_name=pod_name, exec_cmd=exec_cmd, ns=ns)
    

    @staticmethod
    async def execute_python_async(pod_name: str, python_code: str, ns: str = 'default') -> AsyncGenerator[str, None]:
        """
        Asynchronously execute python code in a pod.

        Args:
            pod_name (str): The name of the pod to execute the python code in.
            python_code (str): The python code to execute.
        """
        K8sTool.logger.info(f"Executing python code in pod {pod_name}")
        output_buffer = ""
        capturing_output = False

        async for chunk in K8sTool.execute_command_async(pod_name=pod_name, exec_cmd=['python', '-c', f'{python_code}'], ns=ns):
            chunk['stage'] = 'execute_python'
            if chunk['type'] == 'stdout':
                # Case 1: Start delimiter found in this chunk
                if _start_delimiter in chunk['data'] and not capturing_output:
                    capturing_output = True
                    # Only take the part after the delimiter
                    output_buffer = chunk['data'].split(_start_delimiter, 1)[1]
                    
                    # If end delimiter is also in this chunk, process and yield immediately
                    if _end_delimiter in output_buffer:
                        final_output = output_buffer.split(_end_delimiter, 1)[0]
                        yield {
                            'type': 'tool_output', 
                            'data': final_output, 
                            'stage': 'execute_python'
                        }
                        output_buffer = ""
                        capturing_output = False
                        
                        # If there's content after the end delimiter, yield it separately
                        remaining = chunk['data'].split(_end_delimiter, 1)[1]
                        if remaining:
                            yield {
                                'type': 'stdout',
                                'data': remaining,
                                'stage': 'execute_python'
                            }
                # Case 2: Already capturing and found end delimiter
                elif capturing_output and _end_delimiter in chunk['data']:
                    # Add only the part before the end delimiter
                    output_buffer += chunk['data'].split(_end_delimiter, 1)[0]
                    yield {
                        'type': 'tool_output', 
                        'data': output_buffer, 
                        'stage': 'execute_python'
                    }
                    output_buffer = ""
                    capturing_output = False
                    
                    # If there's content after the end delimiter, yield it separately
                    remaining = chunk['data'].split(_end_delimiter, 1)[1]
                    if remaining:
                        yield {
                            'type': 'stdout',
                            'data': remaining,
                            'stage': 'execute_python'
                        }
                # Case 3: In the middle of capturing output
                elif capturing_output:
                    output_buffer += chunk['data']
                # Case 4: Regular stdout, not capturing special output
                elif not capturing_output:
                    yield {
                        'type': 'stdout',
                        'data': chunk['data'],
                        'stage': 'execute_python'
                    }
            else:
                # Pass through non-stdout chunks (like stderr)
                yield chunk
        
    @staticmethod
    def install_dependencies(pod_name: str, libraries: list[str], ns: str = 'default') -> str:
        """
        Install dependencies in a pod.

        Args:
            pod_name (str): The name of the pod to install the dependencies in.
            libraries (list[str]): The libraries to install.
        """
        K8sTool.logger.info(f"Installing dependencies in pod {pod_name}")
        out: str = ''
        for lib in libraries:
            install_cmd = ['/bin/sh', '-c', f'pip install {lib}']
            out += K8sTool.execute_command(pod_name=pod_name, exec_cmd=install_cmd, ns=ns)
        return out
    

    @staticmethod
    async def install_dependencies_async(pod_name: str, libraries: list[str], ns: str = 'default') -> AsyncGenerator[str, None]:
        """
        Asynchronously install dependencies in a pod asynchronously, streaming output.

        Args:
            pod_name (str): The name of the pod to install the dependencies in.
            libraries (list[str]): The libraries to install.
        """
        K8sTool.logger.info(f"Installing dependencies in pod {pod_name}")
        for lib in libraries:
            install_cmd = ['/bin/sh', '-c', f'pip install {lib}']
            async for chunk in K8sTool.execute_command_async(pod_name=pod_name, exec_cmd=install_cmd, ns=ns):
                chunk['stage'] = 'install_dependencies'
                yield chunk


    @staticmethod
    def terminate_pod(pod_name: str, ns: str = 'default') -> None:
        """
        Terminate a pod.

        Args:
            pod_name (str): The name of the pod to terminate.
            ns (str): The namespace of the pod to terminate.
        """
        K8sTool.logger.info(f"Terminating pod {pod_name} in namespace {ns}")
        client = K8sTool._get_client()
        client.delete_namespaced_pod(name=pod_name, namespace=ns)
    