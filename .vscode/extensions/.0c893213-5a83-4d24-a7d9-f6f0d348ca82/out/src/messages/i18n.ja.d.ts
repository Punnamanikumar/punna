/**
 * Conventions:
 * _message: is for unformatted text that will be shown as-is to
 * the user.
 * _text: is for text that will appear in the UI, possibly with
 * decorations, e.g., $(x) uses the https://octicons.github.com/ and should not
 * be localized
 *
 * If ommitted, we will assume _message.
 */
export declare const messages: {
    config_name_text: string;
    session_language_server_error_text: string;
    up_to_five_checkpoints: string;
    checkpoints_can_only_be_on_valid_apex_source: string;
    local_source_is_out_of_sync_with_the_server: string;
    long_command_start: string;
    long_command_end: string;
    sfdx_update_checkpoints_in_org: string;
    checkpoint_creation_status_org_info: string;
    checkpoint_creation_status_source_line_info: string;
    checkpoint_creation_status_setting_typeref: string;
    checkpoint_creation_status_clearing_existing_checkpoints: string;
    checkpoint_creation_status_uploading_checkpoints: string;
    checkpoint_creation_status_processing_complete_success: string;
    checkpoint_upload_in_progress: string;
    checkpoint_upload_error_wrap_up_message: string;
    cannot_determine_workspace: string;
    cannot_delete_existing_checkpoint: string;
    unable_to_parse_checkpoint_query_result: string;
    unable_to_retrieve_active_user_for_sfdx_project: string;
    unable_to_query_for_existing_checkpoints: string;
    unable_to_load_vscode_core_extension: string;
    no_line_breakpoint_information_for_current_project: string;
    line_breakpoint_information_success: string;
    language_client_not_ready: string;
    unable_to_retrieve_org_info: string;
};
