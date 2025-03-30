#!/bin/bash
deploymentStatus() {
    replicas=$(kubectl get --insecure-skip-tls-verify -o yaml $1 | yq '.spec.replicas' -)
    # wait for replicas to become ready
    until kubectl wait pod --insecure-skip-tls-verify --timeout=0s --for=condition=ContainersReady --selector=$2 | grep "condition met"
    do
        echo "$1 is not ready, waiting 15 seconds"
        sleep 15
    done
    echo "$1 is ready"
}

echo "Creating Kind Cluster"

kind create cluster --config infra/kind-config.yaml
kubectx kind

# from https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml with modifications
echo "Setting up Kube Dashboard"
kubens kube-dashboard
kubectl apply -f infra/kube-dashboard.yaml
echo "Waiting for dashboard to become ready"
deploymentStatus Deployment/kubernetes-dashboard "k8s-app=kubernetes-dashboard"

# TODO: switch to latest and greatest helm chart
# helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
# helm upgrade --install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard --create-namespace --namespace kubernetes-dashboard --values infra/kube-dashboard-values.yml

kubectl proxy &

open http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/#/overview?namespace=default


echo "Create agent-runtime namespace"
kubectl create namespace agent-runtime

kubens agent-runtime


