from typing import BinaryIO
import boto3
from botocore.exceptions import ClientError
from app.config import get_settings
from app.utils.logger import get_logger


logger = get_logger(__name__)
settings = get_settings()

class StorageService:

    def __init__(self) -> None:

        self._client = boto3.client(
            "s3",
            endpoint_url = settings.r2_endpoint_url,
            aws_access_key_id = settings.r2_access_key_id,
            aws_secret_access_key = settings.r2_secret_access_key,
        )
        self._bucket = settings.r2_bucket_name
        logger.info("StorageService initialized for bucket: %s", self._bucket)


    def upload_file(self, file_obj: BinaryIO, key: str, content_type: str = "application/octet-stream") -> str:
        try:
            self._client.upload_fileobj(
                file_obj,
                self._bucket,
                key,
                ExtraArgs={"ContentType": content_type}
            )
            # Use public URL if configured, otherwise fall back to private endpoint
            if settings.r2_public_url:
                url = f"{settings.r2_public_url}/{key}"
            else:
                url = f"{settings.r2_endpoint_url}/{self._bucket}/{key}"
            logger.info("Uploaded file: %s", key)
            return url

        except ClientError as e:
            logger.error("Failed to upload %s: %s",key,e)
            raise

    def delete_prefix(self, prefix: str) -> None:
        try:
            response = self._client.list_objects_v2(
                Bucket=self._bucket,
                Prefix=prefix,
            )
            objects = response.get("Contents", [])
            if not objects:
                logger.info("No objects found with prefix: %s", prefix)
                return

            delete_keys = [{"Key": obj["Key"]} for obj in objects]
            self._client.delete_objects(
                Bucket=self._bucket,
                Delete={"Objects": delete_keys},
            )
            logger.info("Deleted %d objects with prefix: %s", len(delete_keys), prefix)

        except ClientError as e:
            logger.error("Failed to delete prefix %s: %s",prefix,e)
            raise




def get_storage_service() -> StorageService:
    return StorageService()