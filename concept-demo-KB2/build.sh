# first arg is version
if [ -n "$1" ]; then
    VERSION=$1
else
    VERSION=`date +'%Y.%m.%d'`
fi

echo "VERSION: $VERSION"

CONCEPT_IMAGE="fe-3d-concept:$VERSION"

docker build --rm -t "$CONCEPT_IMAGE" .