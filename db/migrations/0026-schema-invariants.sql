-- Apply once in ascending migration filename order.
-- Existing inconsistent history aborts the whole migration; investigate rather than rewrite evidence.
begin;

alter table rawsql_transfer.work_item add constraint chk_work_item_route_model check (
  route_type = 'skipped'
  or route_type = transfer_model
);

alter table rawsql_transfer.work_item add constraint chk_work_item_operation_model check (
  (
    not requires_red_transfer
    or transfer_model = 'immutable'
  )
  and (
    not requires_black_update_transfer
    or transfer_model = 'mutable'
  )
  and (
    not requires_physical_delete_transfer
    or transfer_model = 'mutable'
  )
  and (
    not (
      requires_black_insert_transfer
      or requires_black_update_transfer
    )
    or source_exists
  )
  and (
    not requires_physical_delete_transfer
    or not source_exists
  )
  and not (
    requires_black_insert_transfer
    and requires_black_update_transfer
  )
);

alter table rawsql_transfer.dirty_key_processing add constraint chk_dirty_key_processing_final_result check (
  processing_status = 'failed'
  or (
    processing_status = 'skipped'
    and processing_result in ('no_op', 'duplicate_ignore')
  )
  or (
    processing_status = 'succeeded'
    and processing_result not in ('no_op', 'duplicate_ignore')
  )
);

alter table rawsql_transfer.lineage add constraint chk_lineage_operation_source_kind check (
  (
    transfer_operation = 'black_insert'
    and source_kind = 'transfer_source'
  )
  or (
    transfer_operation = 'red_insert'
    and source_kind = 'reversed_destination_row'
  )
);

commit;
