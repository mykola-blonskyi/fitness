from app import config, storage


def test_the_minio_client_gets_a_connect_and_read_timeout():
    timeout = storage._http_client.connection_pool_kw["timeout"]

    assert timeout.connect_timeout == config.MINIO_CONNECT_TIMEOUT_SECONDS
    assert timeout.read_timeout == config.MINIO_REQUEST_TIMEOUT_SECONDS
