#!/bin/bash
set -e

ENVIRONMENT=$1
NAMESPACE="common"
NAME=$(cat package.json | jq -r '.name')
TAG=$(cat package.json | jq -r '.version')

# if --no-build is passed, then do not build the image
if [ "$2" = "--no-build" ]; then
  echo "Skipping build"
else
  echo "Building image"
  ./build.sh
fi

cd helm
echo "apiVersion: v2
name: $NAME
type: application
version: \"0\"
" >Chart.yaml

CONTEXT=""
if [ "$ENVIRONMENT" = "prod" ]; then
  CONTEXT="gke_smartness-prod_europe-west1_k8s-03-prod"
elif [ "$ENVIRONMENT" = "stage" ]; then
  CONTEXT="gke_smartness-stage_europe-west1_k8s-03-stage"
elif [ "$ENVIRONMENT" = "dev" ]; then
  CONTEXT="gke_smartness-dev_europe-west1_k8s-03-dev"
else
  echo "INVALID ENVIRONMENT $ENVIRONMENT"
  exit 1
fi

echo "Deploying $NAME:$TAG to $CONTEXT/$NAMESPACE using $ENVIRONMENT.yaml"
helm upgrade $NAME . -f $ENVIRONMENT.yaml --set image=europe-docker.pkg.dev/smartness-artifact-registry/docker/$NAME --set imageTag=$TAG --set env=$ENVIRONMENT -n $NAMESPACE --kube-context $CONTEXT --install

# remove the chart file to avoid it being pushed to the repo
rm Chart.yaml
